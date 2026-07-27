import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Loader2, Send, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useActiveProgram } from '@/hooks/use-active-program'
import { useWorkoutAIChat, type AiChatUiMessage } from '@/hooks/useWorkoutAIChat'
import type { AiChatMode } from '@/lib/ai-chat'
import { CyberGrid } from '@/components/cyber-grid'
import { paths } from '@/lib/routes'
import { cn } from '@/lib/utils'

type AiChatPageProps = {
  mode: AiChatMode
  onBack: () => void
  onSaved: () => void
  onRequestLogin: () => void
}

function Bubble({ message }: { message: AiChatUiMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed',
          isUser
            ? 'bg-neon-orange text-primary-foreground font-sans'
            : 'home-surface border border-border text-foreground font-sans',
        )}
      >
        {message.content || (message.streaming ? '…' : '')}
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
  const bottomRef = useRef<HTMLDivElement>(null)

  const chat = useWorkoutAIChat({
    mode,
    currentProgram: mode === 'create' ? null : program,
    userId: user?.id ?? null,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.isStreaming])

  const title =
    mode === 'create' ? 'Create with AI' : mode === 'edit' ? 'Edit with AI' : 'Explain with AI'

  const placeholder =
    mode === 'create'
      ? 'Describe the plan you want…'
      : mode === 'edit'
        ? 'What should we change?'
        : 'Ask anything about your plan…'

  async function handleSend() {
    const value = input
    setInput('')
    await chat.sendMessage(value)
  }

  async function handleSave() {
    const result = await chat.saveDraft()
    if (result.ok) {
      setSaveSuccess(true)
      setTimeout(() => onSaved(), 900)
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
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <CyberGrid />
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur-sm">
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
              {program.name}
            </p>
          </div>
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
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-36">
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
                    : 'Ask questions about your current plan.'}
              </p>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                When the draft looks right, hit Save. I’ll convert it into the app’s program
                format.
              </p>
            </div>
          )}

          {chat.messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}

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

      <footer className="relative z-10 border-t border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            disabled={chat.isStreaming || chat.isSaving}
            placeholder={placeholder}
            className="flex-1 min-h-[48px] rounded-lg border border-border bg-background px-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-orange/60"
          />
          {chat.isStreaming ? (
            <button
              type="button"
              onClick={chat.cancelStream}
              className="min-h-[48px] min-w-[48px] rounded-lg border border-border text-muted-foreground font-mono text-xs"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || chat.isSaving}
              data-haptic="selection"
              className="min-h-[48px] min-w-[48px] rounded-lg bg-neon-orange text-primary-foreground flex items-center justify-center disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

/** Helper for deep-links from home. */
export function aiChatPath(mode: AiChatMode): string {
  return paths.aiChat(mode)
}
