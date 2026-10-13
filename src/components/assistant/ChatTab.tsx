import { useRef, useState, type FormEvent } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_MESSAGES_PER_SESSION = 20

export function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi — I can help you find your way around CHASM People, or explain how a module works. I don't have access to employee records, so for anything about specific people or data, the relevant page in the app is always the source of truth.",
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const userMessageCount = messages.filter((m) => m.role === 'user').length
  const limitReached = userMessageCount >= MAX_MESSAGES_PER_SESSION

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending || limitReached) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Request failed (${res.status})`)
      }
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong reaching the assistant. Try the "Help" tab instead for now.'
      )
    } finally {
      setSending(false)
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-accent text-white' : 'bg-canvas text-ink'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-canvas text-ink-faint rounded-lg px-3 py-2 text-sm">Thinking…</div>
          </div>
        )}
        {error && <p className="text-xs text-critical px-1">{error}</p>}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
        <input
          className="input"
          placeholder={limitReached ? 'Message limit reached for this session' : 'Ask a question…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || limitReached}
        />
        <button type="submit" className="btn-primary !px-3.5" disabled={sending || limitReached || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
