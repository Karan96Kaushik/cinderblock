import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AI_CHAT_SCHEMA_VERSION,
  foldOverflowIntoSummary,
  parseAssistantPayload,
  programToPlaintext,
  trimRecentTurns,
  type AiChatMode,
  type ChatTurn,
} from '@/lib/ai-chat'
import {
  AuthRequiredError,
  extractPlanJson,
  isAiChatConfigured,
  isReportIssueConfigured,
  reportAiChatIssue,
  streamAiChat,
} from '@/lib/amplify/ai-functions'
import { writeActiveProgram } from '@/lib/active-plan'
import { validateProgramDocument, type ProgramDocument, type ProgramIssue } from '@/lib/program-json'
import { pushCloudActiveProgramPlan } from '@/lib/supabase/cloud-sync'
import { readDefaultRunningPlan } from '@/lib/running'

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

function loadSession(sessionId: string): AiChatSessionState | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId))
    if (!raw) return null
    return JSON.parse(raw) as AiChatSessionState
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
      reason: 'validation_failed' | 'client_validation_failed' | 'extract_error' | 'auth'
      message: string
      attempts?: unknown
      validatorErrors?: ProgramIssue[]
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
  const sentInitialContextRef = useRef(false)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => {
    persistSession(session)
  }, [session])

  const updateSession = useCallback((patch: Partial<AiChatSessionState>) => {
    setSession((prev) => ({ ...prev, ...patch }))
  }, [])

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const newMessage = rawMessage.trim()
      if (!newMessage || isStreaming || isSaving) return

      if (!isAiChatConfigured()) {
        setError('AI chat is not configured yet. Deploy Amplify sandbox to get function URLs.')
        return
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

      const currentPlanContext =
        !sentInitialContextRef.current && session.plaintextDraft
          ? session.plaintextDraft
          : null
      sentInitialContextRef.current = true

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

        const assistantTurn: ChatTurn = { role: 'assistant', content: parsed.displayText }
        const afterAssistant = [...trimmed.recentTurns, assistantTurn]
        const finalTrim = trimRecentTurns(afterAssistant)
        runningSummary = foldOverflowIntoSummary(runningSummary, finalTrim.overflow)

        const nextDraft = parsed.plaintextDraft ?? session.plaintextDraft
        const hasPlanDraft = session.hasPlanDraft || Boolean(parsed.plaintextDraft)

        updateSession({
          runningSummary,
          recentTurns: finalTrim.recentTurns,
          plaintextDraft: nextDraft,
          planReady: session.planReady || parsed.planReady,
          hasPlanDraft,
          chatHistoryFull: [...nextHistory, assistantTurn],
        })

        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = {
              ...last,
              content: parsed.displayText,
              streaming: false,
            }
          }
          return copy
        })

        setCheckpoint(undoSnapshot)
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
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isSaving, isStreaming, session, updateSession],
  )

  const canSave =
    Boolean(session.plaintextDraft.trim()) &&
    (session.planReady || session.hasPlanDraft) &&
    !isStreaming &&
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

      const programId = slugProgramId(clientValidation.data.name)
      writeActiveProgram(programId, clientValidation.data)
      await pushCloudActiveProgramPlan(userId, {
        programId,
        program: clientValidation.data,
        running: readDefaultRunningPlan(),
      })

      return { ok: true, plan: clientValidation.data, programId }
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
  }, [canSave, session.plaintextDraft, session.runningSummary, userId])

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

  const canRevert = Boolean(checkpoint) && !isStreaming && !isSaving

  const revertLastChanges = useCallback(() => {
    if (!checkpoint || isStreaming || isSaving) return
    setSession(checkpoint.session)
    setMessages(checkpoint.messages)
    setCheckpoint(null)
    setError(null)
    setHardFailure(null)
    setReportSentId(null)
  }, [checkpoint, isSaving, isStreaming])

  return {
    session,
    messages,
    isStreaming,
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
