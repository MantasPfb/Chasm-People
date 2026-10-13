import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments, useEmployees } from '@/hooks/useEmployees'
import { useAbsenceSummaries } from '@/hooks/useAbsence'
import { Avatar, Badge, DisciplinaryBadge, ErrorState, LoadingState, PageHeader, StatCard } from '@/components/ui/Primitives'
import { EmployeeAbsenceDetailModal } from '@/components/people/EmployeeAbsenceDetailModal'
import { DISCIPLINARY_STAGE_META, type DisciplinaryStage } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

const STAGE_ORDER: DisciplinaryStage[] = [
  'potential_dismissal',
  'final_written_warning',
  'written_warning',
  'verbal_warning',
  'informal_discussion',
]
const STAGE_THRESHOLDS: Record<DisciplinaryStage, number> = {
  informal_discussion: 3,
  verbal_warning: 4,
  written_warning: 5,
  final_written_warning: 6,
  potential_dismissal: 7,
}

export default function AbsenceManagement() {
  const { activeCompanyId } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const { summaries, loading: loadingSummaries, error } = useAbsenceSummaries(activeCompanyId)

  const [deptFilter, setDeptFilter] = useState('')
  const [search, setSearch] = useState('')
  const [onlyOutstandingRtw, setOnlyOutstandingRtw] = useState(false)
  const [detailEmployee, setDetailEmployee] = useState<EmployeeWithRefs | null>(null)

  const summaryByEmployee = useMemo(() => new Map(summaries.map((s) => [s.employee_id, s])), [summaries])

  const rows = useMemo(() => {
    return employees
      .filter((e) => e.employment_status !== 'left')
      .filter((e) => !deptFilter || e.department_id === deptFilter)
      .filter(
        (e) =>
          !search ||
          (e.first_name + ' ' + e.last_name).toLowerCase().includes(search.toLowerCase()) ||
          (e.clock_number ?? '').includes(search)
      )
      .map((e) => ({ employee: e, summary: summaryByEmployee.get(e.id) }))
      .filter((r) => !onlyOutstandingRtw || (r.summary?.outstanding_rtw ?? 0) > 0)
      .sort((a, b) => (b.summary?.instances_12mo ?? 0) - (a.summary?.instances_12mo ?? 0))
  }, [employees, summaryByEmployee, deptFilter, search, onlyOutstandingRtw])

  const totalAtStage = rows.filter((r) => r.summary?.disciplinary_stage).length
  const totalOutstandingRtw = rows.reduce((s, r) => s + (r.summary?.outstanding_rtw ?? 0), 0)
  const avgHolidayPct = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.employee.holiday_taken_days / r.employee.holiday_entitlement_days) * 100, 0) / rows.length)
    : 0

  if (loadingEmployees || loadingSummaries) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Holidays & Absence Management"
        description="Holiday entitlement and take-up alongside a rolling 12-month absence record — instance counts here drive the site's disciplinary triggers automatically."
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="flex flex-wrap gap-2.5 items-center mb-4">
        <input
          className="input max-w-[200px]"
          placeholder="Search name or clock no.…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[200px]" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink-muted cursor-pointer">
          <input type="checkbox" checked={onlyOutstandingRtw} onChange={(e) => setOnlyOutstandingRtw(e.target.checked)} />
          Only outstanding RTW forms
        </label>
      </div>

      <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <StatCard label="People shown" value={String(rows.length)} />
        <StatCard label="Average holiday taken" value={`${avgHolidayPct}%`} />
        <StatCard label="At a disciplinary stage" value={String(totalAtStage)} tone={totalAtStage ? 'amber' : 'good'} />
        <StatCard label="RTW forms outstanding" value={String(totalOutstandingRtw)} tone={totalOutstandingRtw ? 'critical' : 'good'} />
      </div>

      <div className="card overflow-auto">
        <table>
          <thead>
            <tr className="text-left text-ink-faint border-b border-border">
              <th className="px-4 py-2.5 font-medium text-xs">Employee</th>
              <th className="px-4 py-2.5 font-medium text-xs">Department</th>
              <th className="px-4 py-2.5 font-medium text-xs">Entitlement</th>
              <th className="px-4 py-2.5 font-medium text-xs">Taken YTD</th>
              <th className="px-4 py-2.5 font-medium text-xs">% outstanding</th>
              <th className="px-4 py-2.5 font-medium text-xs">Absence days (12mo)</th>
              <th className="px-4 py-2.5 font-medium text-xs">Instances (12mo)</th>
              <th className="px-4 py-2.5 font-medium text-xs">Disciplinary stage</th>
              <th className="px-4 py-2.5 font-medium text-xs">RTW outstanding</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ employee: e, summary }) => {
              const pctOutstanding = 100 - Math.round((e.holiday_taken_days / e.holiday_entitlement_days) * 100)
              return (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar firstName={e.first_name} lastName={e.last_name} color={e.avatar_color} />
                      <div>
                        <p className="text-[13px] font-medium whitespace-nowrap m-0">
                          {e.first_name} {e.last_name}
                        </p>
                        <p className="text-[11px] text-ink-faint m-0">Clock {e.clock_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-ink-muted">{e.department?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-ink-muted">{e.holiday_entitlement_days}d</td>
                  <td className="px-4 py-2 text-sm text-ink-muted">{e.holiday_taken_days}d</td>
                  <td className="px-4 py-2 text-sm text-ink-muted">{pctOutstanding}%</td>
                  <td className="px-4 py-2 text-sm text-ink-muted text-center">{summary?.days_12mo ?? 0}</td>
                  <td className={`px-4 py-2 text-sm text-center ${(summary?.instances_12mo ?? 0) >= 3 ? 'font-bold' : ''}`}>
                    {summary?.instances_12mo ?? 0}
                  </td>
                  <td className="px-4 py-2">
                    <DisciplinaryBadge stage={summary?.disciplinary_stage ?? null} />
                  </td>
                  <td className="px-4 py-2">
                    {(summary?.outstanding_rtw ?? 0) > 0 ? (
                      <Badge tone="critical">{summary!.outstanding_rtw} outstanding</Badge>
                    ) : (
                      <Badge tone="good">Up to date</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button className="btn-secondary !text-xs !py-1 !px-2.5" onClick={() => setDetailEmployee(e)}>
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-sm text-ink-muted">
                  No employees match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-4 flex-wrap text-xs text-ink-muted">
        <span>Disciplinary triggers (instances in last 12 months):</span>
        {STAGE_ORDER.map((stage) => (
          <span key={stage} className="flex items-center gap-1">
            <Badge tone={DISCIPLINARY_STAGE_META[stage].tone}>
              {STAGE_THRESHOLDS[stage]}
              {stage === 'potential_dismissal' ? '+' : ''}
            </Badge>{' '}
            {DISCIPLINARY_STAGE_META[stage].label}
          </span>
        ))}
      </div>

      {detailEmployee && (
        <EmployeeAbsenceDetailModal
          employee={detailEmployee}
          summary={summaryByEmployee.get(detailEmployee.id)}
          onClose={() => setDetailEmployee(null)}
        />
      )}
    </div>
  )
}
