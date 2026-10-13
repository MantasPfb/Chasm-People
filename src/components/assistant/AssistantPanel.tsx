import { useState } from 'react'
import { FaqTab } from './FaqTab'
import { ChatTab } from './ChatTab'

export function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'faq' | 'chat'>('faq')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-overlay flex items-center justify-center hover:bg-accent-dark transition-colors"
        aria-label="Open help assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-full max-w-sm bg-surface shadow-overlay flex flex-col">
            <div className="px-4 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-semibold text-ink m-0">CHASM Assistant</p>
                <p className="text-xs text-ink-faint m-0">Help finding your way around the platform</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-sm text-ink-muted hover:text-ink">
                Close
              </button>
            </div>

            <div className="flex border-b border-border flex-shrink-0">
              <button
                className={`flex-1 py-2.5 text-sm font-medium ${tab === 'faq' ? 'text-accent border-b-2 border-accent' : 'text-ink-faint'}`}
                onClick={() => setTab('faq')}
              >
                Help
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium ${tab === 'chat' ? 'text-accent border-b-2 border-accent' : 'text-ink-faint'}`}
                onClick={() => setTab('chat')}
              >
                Ask AI
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {tab === 'faq' ? <FaqTab onNavigate={() => setOpen(false)} /> : <ChatTab />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
