"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { MessageCircle, Send, Sparkles, X } from "lucide-react"
import { askAssistant, type AssistantMessage } from "@/lib/actions/assistant"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"

export function ChatBubble() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState("")
  const [pending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, pending])

  function send() {
    const text = draft.trim()
    if (!text || pending) return
    const nextHistory = [...messages, { role: "user" as const, content: text }]
    setMessages(nextHistory)
    setDraft("")
    startTransition(async () => {
      const res = await askAssistant(messages, text)
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }])
    })
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t.assistant.close : t.assistant.open}
        aria-expanded={open}
        className={cn(
          "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:bg-primary-hover hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageCircle className="h-6 w-6" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t.assistant.title}
          className="fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-[12px] border border-border bg-card shadow-card-hover"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border bg-panel px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{t.assistant.title}</span>
              <span className="text-xs text-muted-foreground">{t.assistant.subtitle}</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2 rounded-[8px] bg-panel p-3 text-sm text-muted-foreground">
                {t.assistant.greeting}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-[8px] px-3 py-2 text-sm",
                  m.role === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-panel text-foreground",
                )}
              >
                {m.content}
              </div>
            ))}
            {pending && (
              <div className="self-start rounded-[8px] bg-panel px-3 py-2 text-sm text-muted-foreground">
                {t.assistant.thinking}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.assistant.placeholder}
              aria-label={t.assistant.placeholder}
              className="flex h-10 w-full rounded-[4px] border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label={t.assistant.send}>
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
