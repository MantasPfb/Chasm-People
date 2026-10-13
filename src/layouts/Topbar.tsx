import { useAuth } from '@/hooks/useAuth'

export function Topbar() {
  const { profile, memberships, activeCompanyId, activeMembership, setActiveCompanyId, signOut, isPlatformAdmin } =
    useAuth()

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {memberships.length > 1 ? (
          <select
            className="text-sm border border-border rounded px-2 py-1 bg-surface text-ink"
            value={activeCompanyId ?? ''}
            onChange={(e) => setActiveCompanyId(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.company_id} value={m.company_id}>
                {m.company.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-semibold text-ink font-display">{activeMembership?.company.name ?? 'No company'}</p>
        )}
        {activeMembership?.company.is_demo && (
          <span className="text-[11px] font-medium text-amber bg-amber-light border border-amber/20 rounded-sm px-2 py-0.5">
            Demonstration data
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isPlatformAdmin && (
          <span className="text-xs font-medium text-accent-dark bg-accent-light border border-accent/20 rounded-sm px-2 py-0.5">
            Platform Admin
          </span>
        )}
        <div className="text-right">
          <p className="text-sm text-ink leading-tight">{profile?.full_name}</p>
          <p className="text-xs text-ink-faint leading-tight capitalize">
            {activeMembership?.role.replace('_', ' ') ?? ''}
          </p>
        </div>
        <button onClick={() => signOut()} className="text-sm text-ink-muted hover:text-ink">
          Sign out
        </button>
      </div>
    </header>
  )
}
