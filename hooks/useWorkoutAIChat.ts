import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AI_CHAT_MAX_MESSAGE_CHARS,
  AI_CHAT_SCHEMA_VERSION,
  diffPlaintextPlans,
  foldOverflowIntoSummary,
  parseAssistantPayload,
  programToPlaintext,
  stripPlanBlock,
  trimRecentTurns,
  type AiChatMode,
  type ChatTurn,
} from '@/lib/ai-chat'
import {
  AuthRequiredError,
  extractPlanJson,
  isAiChatConfigured,
  isReportIssueConfigured,
  isScopeJudgeConfigured,
  judgePlanScope,
  reportAiChatIssue,
  streamAiChat,
  type ScopeJudgeResult,
} from '@/lib/amplify/ai-functions'
import { writeActiveProgram, getActiveProgram, getActiveProgramId } from '@/lib/active-plan'
import { validateProgramDocument, type ProgramDocument, type ProgramIssue } from '@/lib/program-json'
import { pushCloudActiveProgramPlan } from '@/lib/supabase/cloud-sync'
import { readDefaultRunningPlan } from '@/lib/running'
import { assignNextProgramVersion } from '@/lib/program-version'

const STORAGE_PREFIX = 'cinderblock_ai_chat_'

export type AiChatSessionState = {
  sessionId: string
  mode: AiChatMode
  runningSummary: string
  recentTurns: ChatTurn[]
  plaintextDraft: string
  planReady: boolean
  /** Soft gate: true once an assistant turn included a full plan block. */
  hasPlanDraft: boolean
  chatHistoryFull: ChatTurn[]
}

export type AiChatUiMessage = {
  id: string
  role: ChatRoleUi
  content: string
  streaming?: boolean
}

type ChatRoleUi = 'user' | 'assistant' | 'system'

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}${sessionId}`
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isChatTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== 'object') return false
  const turn = value as ChatTurn
  return (
    (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string'
  )
}

function isValidSessionState(value: unknown): value is AiChatSessionState {
  if (!value || typeof value !== 'object') return false
  const state = value as AiChatSessionState
  return (
    typeof state.sessionId === 'string' &&
    (state.mode === 'create' || state.mode === 'edit' || state.mode === 'discuss') &&
    typeof state.runningSummary === 'string' &&
    typeof state.plaintextDraft === 'string' &&
    typeof state.planReady === 'boolean' &&
    typeof state.hasPlanDraft === 'boolean' &&
    Array.isArray(state.recentTurns) &&
    state.recentTurns.every(isChatTurn) &&
    Array.isArray(state.chatHistoryFull) &&
    state.chatHistoryFull.every(isChatTurn)
  )
}

function loadSession(sessionId: string): AiChatSessionState | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidSessionState(parsed) ? parsed : null
  } catch {
    return null
  }
}

function persistSession(state: AiChatSessionState) {
  try {
    localStorage.setItem(storageKey(state.sessionId), JSON.stringify(state))
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function slugProgramId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `ai-${slug || 'plan'}-${Date.now()}`
}

export type UseWorkoutAIChatOptions = {
  mode: AiChatMode
  /** Existing program for edit/discuss — converted to plaintext on first load. */
  currentProgram?: ProgramDocument | null
  userId: string | null
  sessionId?: string
}

export type SaveDraftResult =
  | { ok: true; plan: ProgramDocument; programId: string }
  | {
      ok: false
      reason:
        | 'validation_failed'
        | 'client_validation_failed'
        | 'extract_error'
        | 'auth'
        | 'scope_rejected'
      message: string
      attempts?: unknown
      validatorErrors?: ProgramIssue[]
    }

function formatScopeRejection(result: ScopeJudgeResult): string {
  const extras = result.extraChanges.slice(0, 8)
  const extraBlock =
    extras.length > 0
      ? `\n\nExtra changes that were not applied:\n${extras.map((item) => `- ${item}`).join('\n')}`
      : ''
  return `Those edits were too broad, so the plan was not updated.\n\n${result.reason}${extraBlock}\n\nAsk for a smaller change, or confirm the extras if you actually want them.`
}

function scopeIssuesFromJudge(result: ScopeJudgeResult): ProgramIssue[] {
  const extras =
    result.extraChanges.length > 0 ? result.extraChanges : [result.reason]
  return extras.map((message, index) => ({
    severity: 'error' as const,
    path: 'scope',
    code: 'overreach',
    message: extras.length > 1 ? `${index + 1}. ${message}` : message,
  }))
}

export function useWorkoutAIChat(options: UseWorkoutAIChatOptions) {
  const { mode, currentProgram, userId } = options
  const [session, setSession] = useState<AiChatSessionState>(() => {
    const sessionId = options.sessionId ?? createSessionId()
    const existing = typeof window !== 'undefined' ? loadSession(sessionId) : null
    if (existing) return existing

    const initialDraft =
      (mode === 'edit' || mode === 'discuss') && currentProgram
        ? programToPlaintext(currentProgram)
        : ''

    return {
      sessionId,
      mode,
      runningSummary: '',
      recentTurns: [],
      plaintextDraft: initialDraft,
      planReady: false,
      hasPlanDraft: false,
      chatHistoryFull: [],
    }
  })

  const [messages, setMessages] = useState<AiChatUiMessage[]>(() => {
    if (session.chatHistoryFull.length === 0) return []
    return session.chatHistoryFull.map((turn, index) => ({
      id: `hist-${index}`,
      role: turn.role,
      content: turn.content,
    }))
  })

  const [isStreaming, setIsStreaming] = useState(false)
  const [isJudging, setIsJudging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [reportSentId, setReportSentId] = useState<string | null>(null)
  const [hardFailure, setHardFailure] = useState<{
    attempts?: unknown
    validatorErrors?: ProgramIssue[]
    message: string
  } | null>(null)
  const [checkpoint, setCheckpoint] = useState<{
    session: AiChatSessionState
    messages: AiChatUiMessage[]
  } | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const baselinePlaintextRef = useRef(
    (mode === 'edit' || mode === 'discuss') && currentProgram
      ? programToPlaintext(currentProgram)
      : '',
  )

  useEffect(() => {
    persistSession(session)
  }, [session])

  const updateSession = useCallback((patch: Partial<AiChatSessionState>) => {
    setSession((prev) => ({ ...prev, ...patch }))
  }, [])

  /** Returns true when the exchange completed; false lets callers restore the input. */
  const sendMessage = useCallback(
    async (rawMessage: string): Promise<boolean> => {
      const newMessage = rawMessage.trim()
      if (!newMessage || isStreaming || isSaving || isJudging) return false

      if (newMessage.length > AI_CHAT_MAX_MESSAGE_CHARS) {
        setError(
          `Message is too long (${newMessage.length} characters, max ${AI_CHAT_MAX_MESSAGE_CHARS}). Try splitting it up.`,
        )
        return false
      }

      if (!isAiChatConfigured()) {
        setError('AI chat is not configured yet. Deploy Amplify sandbox to get function URLs.')
        return false
      }

      setError(null)
      setNeedsReauth(false)
      setHardFailure(null)
      setReportSentId(null)

      // Snapshot pre-turn state so the user can revert this exchange.
      const undoSnapshot = {
        session: structuredClone(session),
        messages: messagesRef.current.map((message) => ({ ...message })),
      }

      const userTurn: ChatTurn = { role: 'user', content: newMessage }
      const nextHistory = [...session.chatHistoryFull, userTurn]
      const withUser = [...session.recentTurns, userTurn]
      const trimmed = trimRecentTurns(withUser)
      let runningSummary = foldOverflowIntoSummary(session.runningSummary, trimmed.overflow)

      // Sent on every turn (not just the first) so the model always edits the
      // real ground-truth plan text instead of reconstructing it from a lossy
      // running summary / trimmed chat history. That reconstruction is what
      // caused "confirmed" edits to come back as full rewrites: once the
      // model lost sight of the exact plan text, it had no choice but to
      // regenerate one from memory, which the scope auditor then rejected.
      const currentPlanContext = session.plaintextDraft.trim() ? session.plaintextDraft : null

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content: newMessage },
        { id: `a-${Date.now()}`, role: 'assistant', content: '', streaming: true },
      ])

      setIsStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller

      let assembled = ''
      try {
        assembled = await streamAiChat({
          mode: session.mode,
          runningSummary,
          currentPlanContext,
          recentTurns: trimmed.recentTurns.slice(0, -1), // exclude the new user turn; it's in newMessage
          newMessage,
          signal: controller.signal,
          onDelta: (chunk) => {
            assembled += chunk
            const live = parseAssistantPayload(assembled, { streaming: true }).displayText
            setMessages((prev) => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: live, streaming: true }
              }
              return copy
            })
          },
        })

        const parsed = parseAssistantPayload(assembled)
        if (parsed.runningSummary) {
          runningSummary = parsed.runningSummary
        }

        let displayText = parsed.displayText
        let nextDraft = parsed.plaintextDraft ?? session.plaintextDraft
        let hasPlanDraft = session.hasPlanDraft || Boolean(parsed.plaintextDraft)
        let planReady = session.planReady || parsed.planReady
        let scopeRejected: ScopeJudgeResult | null = null

        const proposedDraft = parsed.plaintextDraft
        const previousDraft = session.plaintextDraft
        const planChanged =
          Boolean(proposedDraft) &&
          diffPlaintextPlans(previousDraft, proposedDraft ?? '').changed

        if (planChanged && proposedDraft && isScopeJudgeConfigured()) {
          setIsJudging(true)
          try {
            const judgement = await judgePlanScope({
              mode: session.mode,
              stage: 'apply',
              runningSummary,
              recentTurns: trimmed.recentTurns,
              previousPlan: previousDraft,
              proposedPlan: proposedDraft,
            })
            if (judgement.verdict === 'reject') {
              scopeRejected = judgement
              nextDraft = previousDraft
              hasPlanDraft = session.hasPlanDraft
              planReady = session.planReady
              displayText = parseAssistantPayload(stripPlanBlock(assembled)).displayText
              runningSummary = [
                runningSummary.trim(),
                `Scope auditor rejected the last plan rewrite: ${judgement.reason}`,
              ]
                .filter(Boolean)
                .join('\n')
            }
          } catch (err) {
            // Infra failures fail open so a judge outage cannot block chatting.
            console.error('Plan scope check failed; applying draft:', err)
          } finally {
            setIsJudging(false)
          }
        }

        const assistantTurn: ChatTurn = { role: 'assistant', content: displayText }
        const afterAssistant = [...trimmed.recentTurns, assistantTurn]
        const finalTrim = trimRecentTurns(afterAssistant)
        runningSummary = foldOverflowIntoSummary(runningSummary, finalTrim.overflow)

        const historyTurns: ChatTurn[] = [...nextHistory, assistantTurn]

        updateSession({
          runningSummary,
          recentTurns: finalTrim.recentTurns,
          plaintextDraft: nextDraft,
          planReady,
          hasPlanDraft,
          chatHistoryFull: historyTurns,
        })

        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = {
              ...last,
              content: displayText,
              streaming: false,
            }
          }
          if (scopeRejected) {
            copy.push({
              id: `sys-${Date.now()}`,
              role: 'system',
              content: formatScopeRejection(scopeRejected),
            })
          }
          return copy
        })

        setCheckpoint(undoSnapshot)
        return true
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          setNeedsReauth(true)
          setError(err.message)
        } else if ((err as { name?: string })?.name === 'AbortError') {
          setError('Message cancelled.')
        } else {
          setError(err instanceof Error ? err.message : 'AI chat failed')
        }
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant' && last.streaming) {
            copy.pop()
          }
          // Also drop the user bubble if the assistant never completed.
          const maybeUser = copy[copy.length - 1]
          if (maybeUser?.role === 'user' && maybeUser.content === newMessage) {
            copy.pop()
          }
          return copy
        })
        return false
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isSaving, isStreaming, isJudging, session, updateSession],
  )

  const canSave =
    Boolean(session.plaintextDraft.trim()) &&
    (session.planReady || session.hasPlanDraft) &&
    !isStreaming &&
    !isJudging &&
    !isSaving

  const saveDraft = useCallback(async (): Promise<SaveDraftResult> => {
    if (!canSave) {
      return { ok: false, reason: 'extract_error', message: 'Plan is not ready to save yet.' }
    }
    if (!userId) {
      setNeedsReauth(true)
      return { ok: false, reason: 'auth', message: 'Sign in to save your plan.' }
    }

    setIsSaving(true)
    setError(null)
    setHardFailure(null)

    try {
      const result = await extractPlanJson({
        plaintextDraft: session.plaintextDraft,
        runningSummary: session.runningSummary,
        schemaVersion: AI_CHAT_SCHEMA_VERSION,
      })

      if (!result.ok) {
        const failure = {
          attempts: result.attempts,
          validatorErrors: result.validatorErrors,
          message:
            result.error ??
            (result.reason === 'validation_failed'
              ? 'Could not convert the plan to a valid program. You can report this for review.'
              : 'Plan extraction failed.'),
        }
        setHardFailure(failure)
        return {
          ok: false,
          reason: 'validation_failed',
          message: failure.message,
          attempts: result.attempts,
          validatorErrors: result.validatorErrors,
        }
      }

      const clientValidation = validateProgramDocument(result.plan)
      if (!clientValidation.ok) {
        const failure = {
          attempts: result.attempts,
          validatorErrors: clientValidation.issues,
          message: 'Server returned a plan that failed client validation.',
        }
        setHardFailure(failure)
        return {
          ok: false,
          reason: 'client_validation_failed',
          message: failure.message,
          attempts: result.attempts,
          validatorErrors: clientValidation.issues,
        }
      }

      if (isScopeJudgeConfigured()) {
        const userTurns = session.chatHistoryFull
          .filter((turn) => turn.role === 'user')
          .slice(-8)
        try {
          const judgement = await judgePlanScope({
            mode: session.mode,
            stage: 'save',
            runningSummary: session.runningSummary,
            recentTurns: userTurns,
            previousPlan: baselinePlaintextRef.current,
            proposedPlan: session.plaintextDraft,
          })
          if (judgement.verdict === 'reject') {
            const validatorErrors = scopeIssuesFromJudge(judgement)
            const failure = {
              attempts: result.attempts,
              validatorErrors,
              message: `The converted plan changes more than you asked for, so it was not saved. ${judgement.reason}`,
            }
            setHardFailure(failure)
            return {
              ok: false,
              reason: 'scope_rejected',
              message: failure.message,
              attempts: result.attempts,
              validatorErrors,
            }
          }
        } catch (err) {
          console.error('Save-time scope check failed; continuing with save:', err)
        }
      }

      const isCreate = session.mode === 'create'
      const programId = isCreate
        ? slugProgramId(clientValidation.data.name)
        : getActiveProgramId()
      const previous = isCreate ? null : getActiveProgram()
      const versionedProgram = assignNextProgramVersion(clientValidation.data, previous)

      writeActiveProgram(programId, versionedProgram)
      await pushCloudActiveProgramPlan(
        userId,
        {
          programId,
          program: versionedProgram,
          running: readDefaultRunningPlan(),
        },
        { source: 'ai-chat', note: `Saved from AI ${session.mode}` },
      )

      return { ok: true, plan: versionedProgram, programId }
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setNeedsReauth(true)
        return { ok: false, reason: 'auth', message: err.message }
      }
      const message = err instanceof Error ? err.message : 'Save failed'
      setError(message)
      return { ok: false, reason: 'extract_error', message }
    } finally {
      setIsSaving(false)
    }
  }, [canSave, session.chatHistoryFull, session.mode, session.plaintextDraft, session.runningSummary, userId])

  const reportIssue = useCallback(async () => {
    if (!hardFailure || !isReportIssueConfigured()) return
    setIsReporting(true)
    setError(null)
    try {
      const result = await reportAiChatIssue({
        chatHistoryFull: session.chatHistoryFull,
        plaintextDraft: session.plaintextDraft,
        runningSummary: session.runningSummary,
        jsonAttempts: hardFailure.attempts ?? [],
        validatorErrors: hardFailure.validatorErrors ?? [],
        schemaVersion: AI_CHAT_SCHEMA_VERSION,
      })
      setReportSentId(result.reportId)
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setNeedsReauth(true)
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send report')
      }
    } finally {
      setIsReporting(false)
    }
  }, [hardFailure, session])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const canRevert = Boolean(checkpoint) && !isStreaming && !isJudging && !isSaving

  const revertLastChanges = useCallback(() => {
    if (!checkpoint || isStreaming || isJudging || isSaving) return
    setSession(checkpoint.session)
    setMessages(checkpoint.messages)
    setCheckpoint(null)
    setError(null)
    setHardFailure(null)
    setReportSentId(null)
  }, [checkpoint, isJudging, isSaving, isStreaming])

  return {
    session,
    messages,
    isStreaming,
    isJudging,
    isSaving,
    isReporting,
    error,
    needsReauth,
    hardFailure,
    reportSentId,
    canSave,
    canRevert,
    sendMessage,
    saveDraft,
    reportIssue,
    cancelStream,
    revertLastChanges,
    configured: isAiChatConfigured(),
  }
}
