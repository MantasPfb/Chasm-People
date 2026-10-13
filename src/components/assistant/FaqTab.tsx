import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FAQ_ENTRIES } from './faqContent'

export function FaqTab({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return FAQ_ENTRIES
    return FAQ_ENTRIES.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <input
          className="input"
          placeholder="Search how-to topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-ink-faint p-4">
            No topic matches that search — try the "Ask AI" tab for a free-text question.
          </p>
        )}
        {filtered.map((f) => {
          const isOpen = openId === f.id
          return (
            <div key={f.id} className="border-b border-border">
              <button
                className="w-full text-left px-4 py-3 hover:bg-canvas transition-colors"
                onClick={() => setOpenId(isOpen ? null : f.id)}
              >
                <p className="text-sm font-medium text-ink m-0">{f.question}</p>
              </button>
              {isOpen && (
                <div className="px-4 pb-3.5">
                  <p className="text-sm text-ink-muted leading-relaxed mb-2.5">{f.answer}</p>
                  {f.route && (
                    <button
                      className="btn-secondary !text-xs !py-1 !px-2.5"
                      onClick={() => {
                        navigate(f.route!)
                        onNavigate()
                      }}
                    >
                      {f.routeLabel ?? 'Take me there'} →
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
