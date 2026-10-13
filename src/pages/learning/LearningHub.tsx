import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments, useEmployees } from '@/hooks/useEmployees'
import { useCapabilities, useEmployeeCapabilityProfile, useSkillsMatrix } from '@/hooks/useCapabilities'
import { useSops, getSopForCapability } from '@/hooks/useSops'
import { Badge, CompetenceDot, LoadingState, PageHeader } from '@/components/ui/Primitives'
import { ModuleReaderModal } from '@/components/learning/ModuleReaderModal'
import { CAPABILITY_CATEGORY_LABELS, type CapabilityCategory } from '@/lib/types'

export default function LearningHub() {
  const { activeCompanyId } = useAuth()
  const { employees } = useEmployees(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const { capabilities, loading: loadingCapabilities } = useCapabilities(activeCompanyId)
  const { sops } = useSops(activeCompanyId)
  const { rows: matrixRows } = useSkillsMatrix(activeCompanyId)

  const [employeeId, setEmployeeId] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CapabilityCategory | ''>('')
  const [openCapabilityId, setOpenCapabilityId] = useState<string | null>(null)

  const employee = employees.find((e) => e.id === employeeId) ?? null
  const { statuses, reload: reloadProfile } = useEmployeeCapabilityProfile(employeeId || null)

  const myRequired = useMemo(() => [...statuses].sort((a, b) => b.gap - a.gap), [statuses])
  const myCompletion = myRequired.length ? Math.round((myRequired.filter((m) => m.gap === 0).length / myRequired.length) * 100) : null

  // Which departments a capability is relevant to, derived from which roles require it (via the skills matrix rows' role_id -> employee's department).
  const capabilityDepartmentIds = useMemo(() => {
    const map = new Map<string, Set<string>>()
    matrixRows.forEach((row) => {
      const emp = employees.find((e) => e.id === row.employee_id)
      if (!emp?.department_id) return
      const set = map.get(row.capability_id) ?? new Set<string>()
      set.add(emp.department_id)
      map.set(row.capability_id, set)
    })
    return map
  }, [matrixRows, employees])

  const catalog = capabilities.filter((c) => {
    if (categoryFilter && c.category !== categoryFilter) return false
    if (departmentFilter && !(capabilityDepabilityHas(capabilityDepartmentIds, c.id, departmentFilter))) return false
    return true
  })

  function capabilityDepabilityHas(map: Map<string, Set<string>>, capId: string, deptId: string) {
    return map.get(capId)?.has(deptId) ?? false
  }

  function impactFor(capabilityId: string) {
    const rows = matrixRows.filter((r) => r.capability_id === capabilityId)
    const met = rows.filter((r) => r.gap === 0).length
    return { required: rows.length, met }
  }

  const openCapability = openCapabilityId ? capabilities.find((c) => c.id === openCapabilityId) : null
  const openStatus = openCapabilityId ? statuses.find((s) => s.capability_id === openCapabilityId) : null

  if (loadingCapabilities) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Learning Hub"
        description="Self-service training built directly from the Capability Framework and SOP Library — read the standard, confirm you understand it, and your knowledge-level record updates immediately across the Skills Matrix and your profile."
      />

      <div className="card p-4 mb-5">
        <label className="label">I am…</label>
        <select className="input max-w-[340px]" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Select your name to see your required training…</option>
          {employees
            .filter((e) => e.employment_status === 'active')
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name} — {e.role?.title ?? 'No role'}
              </option>
            ))}
        </select>
        <p className="text-[11px] text-ink-faint mt-2 mb-0">
          In the live product this would come from the signed-in account — this is a stand-in for that, to
          demonstrate the principle.
        </p>
      </div>

      {employee && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-[15px] font-bold m-0">Your required training</p>
            {myCompletion !== null && <Badge tone={myCompletion === 100 ? 'good' : 'amber'}>{myCompletion}% complete</Badge>}
          </div>
          {myRequired.length === 0 ? (
            <p className="text-sm text-ink-muted">No capability requirements are defined for your role yet.</p>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {myRequired.map((m) => {
                const sop = getSopForCapability(m.capability_id, sops)
                return (
                  <button key={m.capability_id} className="card p-4 text-left" onClick={() => setOpenCapabilityId(m.capability_id)}>
                    <div className="flex justify-between items-start gap-2">
                      <Badge tone="accent">{CAPABILITY_CATEGORY_LABELS[m.category]}</Badge>
                      {m.gap === 0 ? <Badge tone="good">Met</Badge> : <Badge tone="critical">Gap of {m.gap}</Badge>}
                    </div>
                    <p className="text-sm font-semibold mt-2 mb-0.5">{m.capability_name}</p>
                    {sop && <p className="text-[11px] text-ink-faint mb-2">{sop.code} · {sop.version}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <CompetenceDot level={m.current_level} /> <span className="text-xs text-ink-faint">current</span>
                      <span className="text-ink-faint">→</span>
                      <CompetenceDot level={m.required_level} /> <span className="text-xs text-ink-faint">required</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-[15px] font-bold m-0">Browse all modules</p>
        <div className="flex gap-2.5">
          <select className="input max-w-[200px]" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="input max-w-[220px]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CapabilityCategory | '')}>
            <option value="">All categories</option>
            {Object.entries(CAPABILITY_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {catalog.length === 0 ? (
        <p className="text-sm text-ink-muted">No modules match these filters.</p>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {catalog.map((c) => {
            const sop = getSopForCapability(c.id, sops)
            const impact = impactFor(c.id)
            return (
              <button key={c.id} className="card p-4 text-left" onClick={() => setOpenCapabilityId(c.id)}>
                <Badge tone="accent">{CAPABILITY_CATEGORY_LABELS[c.category]}</Badge>
                <p className="text-sm font-semibold mt-2 mb-0.5">{c.name}</p>
                <p className="text-xs text-ink-faint mb-2.5">{sop ? `${sop.code} · ${sop.version}` : 'No SOP — guidance only'}</p>
                <div className="flex justify-between pt-2.5 border-t border-border text-xs text-ink-muted">
                  <span>{impact.required} required</span>
                  <span>{impact.required ? Math.round((impact.met / impact.required) * 100) : 0}% met</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openCapability && (
        <ModuleReaderModal
          capability={openCapability}
          sops={sops}
          employee={employee}
          currentLevel={openStatus ? openStatus.current_level : employee ? 0 : null}
          requiredLevel={openStatus ? openStatus.required_level : null}
          onClose={() => setOpenCapabilityId(null)}
          onCompleted={reloadProfile}
        />
      )}
    </div>
  )
}
