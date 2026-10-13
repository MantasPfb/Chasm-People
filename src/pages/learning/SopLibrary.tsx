import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useEmployees'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useSops } from '@/hooks/useSops'
import { Badge, ErrorState, LoadingState, PageHeader } from '@/components/ui/Primitives'
import { SopDetailModal } from '@/components/learning/SopDetailModal'
import { CreateSopModal } from '@/components/learning/CreateSopModal'
import { sopReviewStatus } from '@/lib/sop'
import type { SopWithCapabilities } from '@/hooks/useSops'

export default function SopLibrary() {
  const { activeCompanyId } = useAuth()
  const { departments } = useDepartments(activeCompanyId)
  const { capabilities } = useCapabilities(activeCompanyId)
  const { sops, loading, error, reload } = useSops(activeCompanyId)

  const [deptFilter, setDeptFilter] = useState('')
  const [linkFilter, setLinkFilter] = useState<'' | 'linked' | 'process'>('')
  const [creating, setCreating] = useState(false)
  const [viewingSop, setViewingSop] = useState<SopWithCapabilities | null>(null)

  const visibleSops = sops
    .filter((s) => !deptFilter || s.department_id === deptFilter)
    .filter((s) => !linkFilter || (linkFilter === 'linked' ? s.capability_ids.length > 0 : s.capability_ids.length === 0))

  const linkedCount = sops.filter((s) => s.capability_ids.length > 0).length
  const processCount = sops.filter((s) => s.capability_ids.length === 0).length

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="SOP Library"
        description="The documented standard behind the site's procedures. Some SOPs are linked to a capability — the standard an assessment is checked against. Others are departmental process documents with no individual competence attached."
        action={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            New SOP
          </button>
        }
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="flex flex-wrap gap-2.5 items-center mb-4">
        <select className="input max-w-[220px]" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select className="input max-w-[240px]" value={linkFilter} onChange={(e) => setLinkFilter(e.target.value as '' | 'linked' | 'process')}>
          <option value="">All SOPs ({sops.length})</option>
          <option value="linked">Capability-linked ({linkedCount})</option>
          <option value="process">Process / departmental ({processCount})</option>
        </select>
      </div>

      <div className="space-y-6">
        {departments.map((dept) => {
          const sopsInDept = visibleSops.filter((s) => s.department_id === dept.id)
          if (sopsInDept.length === 0) return null
          return (
            <div key={dept.id}>
              <p className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-2.5">{dept.name}</p>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {sopsInDept.map((sop) => {
                  const reviewStatus = sopReviewStatus(sop.review_due)
                  const isLinked = sop.capability_ids.length > 0
                  const linkedCap = isLinked ? capabilities.find((c) => c.id === sop.capability_ids[0]) : null
                  return (
                    <button key={sop.id} className="card p-4.5 text-left" onClick={() => setViewingSop(sop)}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-[13px] font-bold text-accent m-0">{sop.code}</p>
                        <Badge tone={reviewStatus.tone}>{reviewStatus.label}</Badge>
                      </div>
                      <p className="text-sm font-semibold mt-1 mb-0.5">{sop.title}</p>
                      <p className="text-xs text-ink-faint mb-2">
                        {sop.version} · {sop.owner}
                      </p>
                      <p className="text-[13px] text-ink-muted mb-3">{sop.summary}</p>
                      <div className="flex justify-between items-center pt-2.5 border-t border-border text-xs text-ink-muted">
                        {isLinked ? (
                          <Badge tone="accent">{linkedCap ? linkedCap.name : 'Linked capability'}</Badge>
                        ) : (
                          <Badge>Process SOP — no linked capability</Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {visibleSops.length === 0 && <p className="text-sm text-ink-muted">No SOPs match this filter.</p>}
      </div>

      {creating && activeCompanyId && (
        <CreateSopModal
          companyId={activeCompanyId}
          departments={departments}
          capabilities={capabilities}
          existingSops={sops}
          onClose={() => setCreating(false)}
          onCreated={reload}
        />
      )}
      {viewingSop && (
        <SopDetailModal
          sop={viewingSop}
          departments={departments}
          capabilities={capabilities}
          onClose={() => setViewingSop(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
