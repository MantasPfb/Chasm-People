import type { ReactNode } from 'react'
import type { DisciplinaryStage } from '@/lib/types'
import { DISCIPLINARY_STAGE_META } from '@/lib/types'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 pl-3.5 border-l-4 border-accent">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">{title}</h1>
        {description && <p className="text-sm text-ink-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sublabel,
  tone = 'default',
}: {
  label: string
  value: string
  sublabel?: string
  tone?: 'default' | 'good' | 'amber' | 'critical'
}) {
  const toneClass =
    tone === 'good'
      ? 'text-good'
      : tone === 'amber'
        ? 'text-amber'
        : tone === 'critical'
          ? 'text-critical'
          : 'text-ink'
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</p>
      {sublabel && <p className="text-xs text-ink-faint mt-1">{sublabel}</p>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'good' | 'amber' | 'critical' | 'accent' | 'brightblue'
}) {
  const toneClass =
    {
      default: 'bg-canvas text-ink-muted border-border',
      good: 'bg-good-light text-good border-good/20',
      amber: 'bg-amber-light text-amber border-amber/20',
      critical: 'bg-critical-light text-critical border-critical/20',
      accent: 'bg-accent-light text-accent-dark border-accent/20',
      brightblue: 'bg-brightblue-light text-brightblue border-brightblue/20',
    }[tone]
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  )
}

export function RiskBadge({ status }: { status: 'on_track' | 'at_risk' }) {
  return status === 'at_risk' ? <Badge tone="critical">At risk</Badge> : <Badge tone="good">On track</Badge>
}

export function DisciplinaryBadge({ stage }: { stage: DisciplinaryStage | null }) {
  if (!stage) return <span className="text-xs text-ink-faint">—</span>
  const meta = DISCIPLINARY_STAGE_META[stage]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function ViewToggle({ view, setView }: { view: 'charts' | 'table'; setView: (v: 'charts' | 'table') => void }) {
  return (
    <div className="inline-flex rounded border border-border overflow-hidden">
      {(['charts', 'table'] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-3.5 py-1.5 text-sm font-medium ${
            view === v ? 'bg-accent text-white' : 'bg-surface text-ink-muted hover:bg-canvas'
          }`}
        >
          {v === 'charts' ? 'Charts' : 'Table'}
        </button>
      ))}
    </div>
  )
}

export function StatusPill({ status }: { status: 'active' | 'on_leave' | 'left' }) {
  const map = {
    active: { label: 'Active', tone: 'good' as const },
    on_leave: { label: 'On leave', tone: 'amber' as const },
    left: { label: 'Left', tone: 'default' as const },
  }
  const item = map[status]
  return <Badge tone={item.tone}>{item.label}</Badge>
}

/** A small colored dot + number representing a 0-5 competence level. */
export function CompetenceDot({ level }: { level: number }) {
  const tone =
    level === 0
      ? 'bg-critical'
      : level <= 2
        ? 'bg-amber'
        : level <= 4
          ? 'bg-good'
          : 'bg-accent'
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white ${tone}`}
      title={`Level ${level}`}
    >
      {level}
    </span>
  )
}

export function Avatar({ firstName, lastName, color }: { firstName: string; lastName: string; color?: string | null }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  return (
    <span
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color ?? '#6E7173' }}
    >
      {initials}
    </span>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 px-6">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-ink-muted">
      Loading…
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-critical/30 bg-critical-light px-4 py-3 text-sm text-critical">
      {message}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  width = 520,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-surface rounded-lg shadow-overlay w-full max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <button onClick={onClose} className="text-sm text-ink-muted hover:text-ink flex-shrink-0">
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function PlaceholderModule({
  title,
  description,
  plannedCapabilities,
}: {
  title: string
  description: string
  plannedCapabilities: string[]
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="card px-6 py-6">
        <p className="text-sm font-medium text-ink mb-3">Planned for this module</p>
        <ul className="space-y-2">
          {plannedCapabilities.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-ink-muted">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-border-strong flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-5 border-t border-border">
          <Badge tone="accent">Not yet available in this beta</Badge>
        </div>
      </div>
    </div>
  )
}
