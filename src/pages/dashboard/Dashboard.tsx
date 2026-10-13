import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEmployees, useDepartments } from '@/hooks/useEmployees'
import { useSkillsMatrix } from '@/hooks/useCapabilities'
import { useManningRequirements } from '@/hooks/useShifts'
import { holidayRiskStatus } from '@/lib/holiday'
import { PageHeader, StatCard, LoadingState, ErrorState, Badge } from '@/components/ui/Primitives'
import { CAPABILITY_CATEGORY_LABELS } from '@/lib/types'

export default function Dashboard() {
  const { activeCompanyId, activeMembership, profile } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const { rows, loading: loadingMatrix, error } = useSkillsMatrix(activeCompanyId)
  const { manningRequirements, loading: loadingManning } = useManningRequirements(activeCompanyId)

  const activeEmployees = employees.filter((e) => e.employment_status === 'active')

  const recruitmentGap = useMemo(() => {
    const totalRequired = manningRequirements.reduce((s, m) => s + m.required_headcount, 0)
    const totalActual = manningRequirements.reduce(
      (s, m) => s + activeEmployees.filter((e) => e.department_id === m.department_id).length,
      0
    )
    return { gap: totalRequired - totalActual, totalRequired, totalActual }
  }, [manningRequirements, activeEmployees])

  const holidayAtRiskCount = useMemo(
    () => activeEmployees.filter((e) => holidayRiskStatus(e.holiday_entitlement_days, e.holiday_taken_days) === 'at_risk').length,
    [activeEmployees]
  )

  const byDepartment = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of activeEmployees) {
      const name = e.department?.name ?? 'Unassigned'
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [activeEmployees])

  const activeRoles = useMemo(() => new Set(employees.map((e) => e.role_id).filter(Boolean)).size, [employees])

  const coverage = useMemo(() => {
    if (rows.length === 0) return null
    const met = rows.filter((r) => r.gap === 0).length
    return Math.round((met / rows.length) * 100)
  }, [rows])

  const complianceCoverage = useMemo(() => {
    const complianceRows = rows.filter((r) => r.category === 'mandatory_compliance')
    if (complianceRows.length === 0) return null
    const met = complianceRows.filter((r) => r.gap === 0).length
    return Math.round((met / complianceRows.length) * 100)
  }, [rows])

  const outstandingGaps = useMemo(() => rows.filter((r) => r.gap > 0).length, [rows])

  const assessmentsCompleted = useMemo(
    () => rows.filter((r) => r.last_assessed_at !== null).length,
    [rows]
  )

  const categoryBreakdown = useMemo(() => {
    const categories = Object.keys(CAPABILITY_CATEGORY_LABELS) as (keyof typeof CAPABILITY_CATEGORY_LABELS)[]
    return categories.map((category) => {
      const catRows = rows.filter((r) => r.category === category)
      const met = catRows.filter((r) => r.gap === 0).length
      return {
        category,
        label: CAPABILITY_CATEGORY_LABELS[category],
        total: catRows.length,
        pct: catRows.length ? Math.round((met / catRows.length) * 100) : 0,
      }
    })
  }, [rows])

  if (loadingEmployees || loadingMatrix || loadingManning) return <LoadingState />

  return (
    <div>
      <PageHeader
        title={`Welcome back${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}`}
        description={`${activeMembership?.company.name ?? ''} — Riverside Plant overview`}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {activeMembership?.company.is_demo && (
        <div className="mb-5">
          <Badge tone="amber">This workspace contains demonstration data, clearly separate from any live company data</Badge>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total employees" value={String(activeEmployees.length)} sublabel={`${employees.length} total incl. leave`} />
        <StatCard label="Active job roles" value={String(activeRoles)} />
        <StatCard
          label="Recruitment gap"
          value={`${recruitmentGap.gap > 0 ? '+' : ''}${recruitmentGap.gap}`}
          tone={recruitmentGap.gap > 0 ? 'critical' : 'good'}
          sublabel={`${recruitmentGap.totalActual} of ${recruitmentGap.totalRequired} required`}
        />
        <StatCard
          label="Capability coverage"
          value={coverage !== null ? `${coverage}%` : '—'}
          tone={coverage !== null && coverage < 70 ? 'amber' : 'good'}
          sublabel="requirements fully met"
        />
        <StatCard
          label="Compliance completion"
          value={complianceCoverage !== null ? `${complianceCoverage}%` : '—'}
          tone={complianceCoverage !== null && complianceCoverage < 90 ? 'critical' : 'good'}
          sublabel="mandatory requirements"
        />
        <StatCard label="Outstanding skill gaps" value={String(outstandingGaps)} tone={outstandingGaps > 0 ? 'amber' : 'good'} />
        <StatCard label="Holiday at risk" value={String(holidayAtRiskCount)} tone={holidayAtRiskCount ? 'amber' : 'good'} />
        <StatCard label="Assessments on record" value={String(assessmentsCompleted)} />
        <StatCard label="Departments" value={String(departments.length)} />
        <StatCard label="Employees on leave" value={String(employees.filter((e) => e.employment_status === 'on_leave').length)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm font-medium text-ink mb-4">Headcount by department</p>
          <div className="space-y-3">
            {byDepartment.map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-ink-muted">{name}</span>
                  <span className="text-ink font-medium">{count}</span>
                </div>
                <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(count / activeEmployees.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-ink mb-4">Capability coverage by category</p>
          <div className="space-y-4">
            {categoryBreakdown.map((c) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-ink-muted">{c.label}</span>
                  <span className="text-ink font-medium">{c.pct}%</span>
                </div>
                <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.pct < 70 ? 'bg-amber' : 'bg-good'}`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <p className="text-xs text-ink-faint mt-1">{c.total} requirements tracked</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
