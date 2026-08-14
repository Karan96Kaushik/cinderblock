import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, FileText, Loader2, Send, Sparkles, Undo2, X } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useActiveProgram } from '@/hooks/use-active-program'
import { useWorkoutAIChat, type AiChatUiMessage } from '@/hooks/useWorkoutAIChat'
import type { AiChatMode } from '@/lib/ai-chat'
import { CyberGrid } from '@/components/cyber-grid'
import { ChatMarkdown } from '@/components/gym/ai-chat/chat-markdown'
import { paths } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { formatProgramVersionLabel } from '@/lib/program-version'

type AiChatPageProps = {
  mode: AiChatMode
  onBack: () => void
  onSaved: () => void
  onRequestLogin: () => void
}

function Bubble({ message }: { message: AiChatUiMessage }) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed border border-neon-yellow/40 bg-neon-yellow/5 text-foreground font-sans whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-neon-orange text-primary-foreground font-sans whitespace-pre-wrap'
            : 'home-surface border border-border text-foreground font-sans',
        )}
      >
        {isUser ? (
          message.content
        ) : message.content ? (
          <ChatMarkdown content={message.content} />
        ) : message.streaming ? (
          '…'
        ) : null}
        {message.streaming && (
          <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-neon-orange/80 animate-pulse" />
        )}
      </div>
    </div>
  )
}

export function AiChatPage({ mode, onBack, onSaved, onRequestLogin }: AiChatPageProps) {
  const { user, isAuthenticated, isSupabaseEnabled, isLoading } = useAuth()
  const { program } = useActiveProgram()
  const [input, setInput] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showPlanPreview, setShowPlanPreview] = useState(false)
  const [viewedDraft, setViewedDraft] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const chat = useWorkoutAIChat({
    mode,
    currentProgram: mode === 'create' ? null : program,
    userId: user?.id ?? null,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.isStreaming])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  useEffect(() => {
    if (!showPlanPreview) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowPlanPreview(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showPlanPreview])

  const planDraft = chat.session.plaintextDraft
  const hasRevisedPlan = chat.session.hasPlanDraft
  /** Dot on the Plan button when the AI produced a revision the user hasn't opened yet. */
  const hasUnseenRevision = hasRevisedPlan && Boolean(planDraft) && planDraft !== viewedDraft

  function openPlanPreview() {
    setViewedDraft(planDraft)
    setShowPlanPreview(true)
  }

  const title =
    mode === 'create'
      ? 'Create with AI'
      : mode === 'edit'
        ? 'Edit with AI'
        : 'Discuss with AI'

  const placeholder =
    mode === 'create'
      ? 'Describe the plan you want…'
      : mode === 'edit'
        ? 'What should we change?'
        : 'Ask anything about your plan…'

  async function handleSend() {
    const value = input
    setInput('')
    const sent = await chat.sendMessage(value)
    if (!sent) {
      // Failed or cancelled exchanges pop the user bubble, so give the text back.
      setInput((current) => current || value)
    }
  }

  async function handleSave() {
    const result = await chat.saveDraft()
    if (result.ok) {
      setSaveSuccess(true)
      setTimeout(() => onSaved(), 900)
    } else {
      // Failure details render in the chat area, so get the sheet out of the way.
      setShowPlanPreview(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neon-orange" />
      </div>
    )
  }

  if (!isSupabaseEnabled || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <CyberGrid />
        <div className="relative z-10 max-w-lg mx-auto px-4 pt-24">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-neon-orange mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="home-surface border border-border rounded-lg p-6">
            <Sparkles className="w-6 h-6 text-neon-orange mb-3" />
            <h1 className="font-sans text-xl font-bold text-foreground mb-2">{title}</h1>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-5">
              AI workout chat requires a signed-in Supabase account so your plans can sync
              securely.
            </p>
            <button
              type="button"
              onClick={onRequestLogin}
              data-haptic="success"
              className="w-full min-h-[48px] rounded-lg font-mono text-sm font-bold tracking-widest uppercase bg-neon-orange text-primary-foreground"
            >
              Sign in to continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-background relative overflow-hidden flex flex-col">
      <CyberGrid />
      <header className="relative z-10 shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-neon-orange"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-sans text-base font-bold text-foreground truncate">{title}</h1>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {program.name} · {formatProgramVersionLabel(program.version)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!planDraft.trim()}
              onClick={openPlanPreview}
              data-haptic="selection"
              title={hasRevisedPlan ? 'View revised plan' : 'View current plan'}
              className={cn(
                'relative min-h-[40px] px-3 rounded-lg font-mono text-xs font-bold tracking-widest uppercase transition-colors inline-flex items-center gap-1.5',
                planDraft.trim()
                  ? 'border border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40'
                  : 'border border-border/40 text-muted-foreground/40 cursor-not-allowed',
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Plan
              {hasUnseenRevision && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neon-orange animate-pulse" />
              )}
            </button>
            <button
              type="button"
              disabled={!chat.canRevert}
              onClick={chat.revertLastChanges}
              data-haptic="selection"
              title="Revert last changes"
              className={cn(
                'min-h-[40px] px-3 rounded-lg font-mono text-xs font-bold tracking-widest uppercase transition-colors inline-flex items-center gap-1.5',
                chat.canRevert
                  ? 'border border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40'
                  : 'border border-border/40 text-muted-foreground/40 cursor-not-allowed',
              )}
            >
              <Undo2 className="w-3.5 h-3.5" />
              Revert
            </button>
            <button
              type="button"
              disabled={!chat.canSave || saveSuccess}
              onClick={handleSave}
              data-haptic="success"
              className={cn(
                'min-h-[40px] px-4 rounded-lg font-mono text-xs font-bold tracking-widest uppercase transition-opacity',
                chat.canSave && !saveSuccess
                  ? 'bg-neon-orange text-primary-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {chat.isSaving ? 'Saving…' : saveSuccess ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {!chat.configured && (
            <div className="rounded-lg border border-neon-yellow/40 bg-neon-yellow/5 px-3 py-2 font-mono text-xs text-neon-yellow">
              Deploy Amplify (`npx ampx sandbox`) and set CEREBRAS_API_KEY secret to enable AI
              chat.
            </div>
          )}

          {chat.messages.length === 0 && (
            <div className="home-surface border border-border rounded-lg p-4">
              <p className="font-sans text-sm text-foreground mb-1">
                {mode === 'create'
                  ? 'Tell me what kind of program you want.'
                  : mode === 'edit'
                    ? 'Your current plan is loaded. Say what to change.'
                    : 'Ask questions about your current plan — form, progressions, swaps, whatever.'}
              </p>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                {mode === 'discuss'
                  ? 'I’ll answer using your active program. If you want changes, ask and I’ll confirm before rewriting.'
                  : 'When the draft looks right, hit Save. I’ll convert it into the app’s program format.'}
              </p>
            </div>
          )}

          {chat.messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}

          {chat.isJudging && (
            <div className="rounded-lg border border-border home-surface px-3 py-2 font-mono text-xs text-muted-foreground">
              Checking that these changes stay within what you asked for…
            </div>
          )}

          {chat.error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
              {chat.error}
              {chat.needsReauth && (
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="block mt-2 underline text-neon-orange"
                >
                  Sign in again
                </button>
              )}
            </div>
          )}

          {chat.hardFailure && (
            <div className="rounded-lg border border-border home-surface p-4 space-y-3">
              <p className="font-sans text-sm text-foreground">{chat.hardFailure.message}</p>
              <p className="font-mono text-xs text-muted-foreground">
                Your draft is still saved locally — you can keep chatting or retry Save.
              </p>
              {chat.reportSentId ? (
                <p className="font-mono text-xs text-neon-orange">
                  Report sent ({chat.reportSentId.slice(0, 8)}…)
                </p>
              ) : (
                <button
                  type="button"
                  disabled={chat.isReporting}
                  onClick={() => chat.reportIssue()}
                  className="min-h-[40px] px-4 rounded-lg border border-border font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40"
                >
                  {chat.isReporting ? 'Sending…' : 'Report for review'}
                </button>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="relative z-10 shrink-0 border-t border-border/60 bg-background/90 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            disabled={chat.isStreaming || chat.isJudging || chat.isSaving}
            placeholder={placeholder}
            rows={1}
            aria-label="Message"
            className="flex-1 min-h-[48px] max-h-40 resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/60 leading-relaxed"
          />
          {chat.isJudging ? (
            <div
              className="min-h-[48px] min-w-[48px] rounded-lg border border-border text-muted-foreground flex items-center justify-center shrink-0"
              aria-label="Checking change scope"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : chat.isStreaming ? (
            <button
              type="button"
              onClick={chat.cancelStream}
              className="min-h-[48px] min-w-[48px] rounded-lg border border-border text-muted-foreground font-mono text-xs shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || chat.isSaving}
              data-haptic="selection"
              className="min-h-[48px] min-w-[48px] rounded-lg bg-neon-orange text-primary-foreground flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="max-w-2xl mx-auto px-4 pb-2 font-mono text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for new line
        </p>
      </footer>

      {showPlanPreview && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Plan preview"
        >
          <button
            type="button"
            aria-label="Close plan preview"
            onClick={() => setShowPlanPreview(false)}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          <div className="relative z-10 mx-auto w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-t-xl border border-b-0 border-border bg-background">
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <FileText className="w-4 h-4 text-neon-orange shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="font-sans text-sm font-bold text-foreground truncate">
                  {hasRevisedPlan ? 'Revised plan (draft)' : 'Current plan'}
                </h2>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {hasRevisedPlan
                    ? 'Not saved yet — review before saving'
                    : `${program.name} · ${formatProgramVersionLabel(program.version)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanPreview(false)}
                aria-label="Close"
                className="p-2 -mr-2 rounded-md text-muted-foreground hover:text-neon-orange"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
              <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {planDraft}
              </pre>
            </div>

            <div className="shrink-0 border-t border-border/60 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-3">
              <p className="flex-1 font-mono text-[10px] text-muted-foreground leading-relaxed">
                {chat.canSave || saveSuccess
                  ? 'Saving converts this draft into your active program.'
                  : hasRevisedPlan
                    ? 'Finish the conversation before saving.'
                    : 'No AI changes yet — ask for edits in the chat.'}
              </p>
              <button
                type="button"
                disabled={!chat.canSave || saveSuccess}
                onClick={() => void handleSave()}
                data-haptic="success"
                className={cn(
                  'min-h-[40px] px-4 rounded-lg font-mono text-xs font-bold tracking-widest uppercase transition-opacity shrink-0',
                  chat.canSave && !saveSuccess
                    ? 'bg-neon-orange text-primary-foreground'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {chat.isSaving ? 'Saving…' : saveSuccess ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Helper for deep-links from home. */
export function aiChatPath(mode: AiChatMode): string {
  return paths.aiChat(mode)
}
