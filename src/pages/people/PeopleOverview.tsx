import { useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import '@/lib/chartSetup'
import { useAuth } from '@/hooks/useAuth'
import { useEmployees, useDepartments } from '@/hooks/useEmployees'
import { useShifts, useManningRequirements } from '@/hooks/useShifts'
import { holidayRiskStatus } from '@/lib/holiday'
import { Badge, LoadingState, PageHeader, RiskBadge, StatCard, ViewToggle } from '@/components/ui/Primitives'
import { TIER_LABELS, type EmployeeTier } from '@/lib/types'

const TIER_COLORS: Record<EmployeeTier, string> = { management: '#0A1629', indirect: '#406FB6', direct: '#8FB6EA' }

export default function PeopleOverview() {
  const { activeCompanyId } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)
  const { departments, loading: loadingDepartments } = useDepartments(activeCompanyId)
  const { shifts, loading: loadingShifts } = useShifts(activeCompanyId)
  const { manningRequirements, loading: loadingManning } = useManningRequirements(activeCompanyId)

  const [deptFilter, setDeptFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [tierFilter, setTierFilter] = useState<EmployeeTier | ''>('')
  const [view, setView] = useState<'charts' | 'table'>('charts')

  const filtered = employees.filter((e) => {
    if (deptFilter && e.department_id !== deptFilter) return false
    if (shiftFilter && e.shift_id !== shiftFilter) return false
    if (tierFilter && e.tier !== tierFilter) return false
    return true
  })
  const active = filtered.filter((e) => e.employment_status === 'active')
  const deptList = deptFilter ? departments.filter((d) => d.id === deptFilter) : departments

  const tierCounts = { management: 0, indirect: 0, direct: 0 }
  active.forEach((e) => tierCounts[e.tier]++)
  const payCounts = { salaried: 0, hourly: 0 }
  active.forEach((e) => payCounts[e.pay_type]++)

  function weeklyCostOf(list: typeof active) {
    return list.reduce((sum, e) => sum + (e.role?.hourly_rate ? Number(e.role.hourly_rate) : 0) * Number(e.contracted_hours ?? 0), 0)
  }
  const weeklyCost = weeklyCostOf(active)

  const manningRows = deptList.map((d) => {
    const reqRow = manningRequirements.find((m) => m.department_id === d.id)
    const required = reqRow ? reqRow.required_headcount : 0
    const actualCount = employees.filter(
      (e) =>
        e.department_id === d.id &&
        e.employment_status === 'active' &&
        (!shiftFilter || e.shift_id === shiftFilter) &&
        (!tierFilter || e.tier === tierFilter)
    ).length
    return { dept: d, required, actual: actualCount, gap: required - actualCount }
  })
  const totalRequired = manningRows.reduce((s, r) => s + r.required, 0)
  const totalActual = manningRows.reduce((s, r) => s + r.actual, 0)
  const totalGap = totalRequired - totalActual

  const holidayRows = useMemo(
    () =>
      active
        .map((e) => ({
          emp: e,
          pct: Math.round((e.holiday_taken_days / e.holiday_entitlement_days) * 100),
          status: holidayRiskStatus(e.holiday_entitlement_days, e.holiday_taken_days),
        }))
        .sort((a, b) => (a.status === b.status ? b.pct - a.pct : a.status === 'at_risk' ? -1 : 1)),
    [active]
  )
  const atRiskCount = holidayRows.filter((r) => r.status === 'at_risk').length
  const avgPctTaken = holidayRows.length ? Math.round(holidayRows.reduce((s, r) => s + r.pct, 0) / holidayRows.length) : 0

  const deptHeadcountChartData = {
    labels: deptList.map((d) => d.name),
    datasets: (['management', 'indirect', 'direct'] as EmployeeTier[]).map((tier) => ({
      label: TIER_LABELS[tier],
      backgroundColor: TIER_COLORS[tier],
      data: deptList.map((d) => active.filter((e) => e.department_id === d.id && e.tier === tier).length),
    })),
  }
  const tierDonutData = {
    labels: ['Management', 'Indirect', 'Direct'],
    datasets: [{ data: [tierCounts.management, tierCounts.indirect, tierCounts.direct], backgroundColor: [TIER_COLORS.management, TIER_COLORS.indirect, TIER_COLORS.direct] }],
  }
  const manningChartData = {
    labels: manningRows.map((r) => r.dept.name),
    datasets: [
      { label: 'Required', backgroundColor: '#D2D1CA', data: manningRows.map((r) => r.required) },
      { label: 'Actual', backgroundColor: '#406FB6', data: manningRows.map((r) => r.actual) },
    ],
  }
  const costChartData = {
    labels: deptList.map((d) => d.name),
    datasets: [{ label: 'Weekly cost (£)', backgroundColor: '#3C7A5C', data: deptList.map((d) => weeklyCostOf(active.filter((e) => e.department_id === d.id))) }],
  }
  const shiftChartData = {
    labels: shifts.map((s) => s.name),
    datasets: [{ label: 'Headcount', backgroundColor: '#406FB6', data: shifts.map((s) => active.filter((e) => e.shift_id === s.id).length) }],
  }

  if (loadingEmployees || loadingDepartments || loadingShifts || loadingManning) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="People Overview"
        description="Headcount, manning and holiday position across the site — filter by department, shift or tier to drill in."
      />

      <div className="flex flex-wrap gap-2.5 items-center justify-between mb-5">
        <div className="flex flex-wrap gap-2.5">
          <select className="input max-w-[200px]" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input max-w-[220px]" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="">All shifts</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input max-w-[180px]" value={tierFilter} onChange={(e) => setTierFilter(e.target.value as EmployeeTier | '')}>
            <option value="">All tiers</option>
            <option value="management">Management</option>
            <option value="indirect">Indirect</option>
            <option value="direct">Direct</option>
          </select>
        </div>
        <ViewToggle view={view} setView={setView} />
      </div>

      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <StatCard label="Headcount (active)" value={String(active.length)} sublabel={filtered.length !== active.length ? `${filtered.length} incl. leave/left` : undefined} />
        <StatCard label="Management" value={String(tierCounts.management)} />
        <StatCard label="Indirect" value={String(tierCounts.indirect)} />
        <StatCard label="Direct" value={String(tierCounts.direct)} />
        <StatCard label="Salaried / Hourly" value={`${payCounts.salaried} / ${payCounts.hourly}`} />
        <StatCard label="Recruitment gap" value={`${totalGap > 0 ? '+' : ''}${totalGap}`} tone={totalGap > 0 ? 'critical' : 'good'} sublabel={`${totalActual} of ${totalRequired} required`} />
        <StatCard label="Holiday at risk" value={String(atRiskCount)} tone={atRiskCount ? 'amber' : 'good'} sublabel={`${avgPctTaken}% avg. taken`} />
        <StatCard label="Weekly labour cost" value={`£${weeklyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </div>

      {view === 'charts' ? (
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Headcount by department &amp; tier</p>
            <div style={{ height: 260 }}>
              <Bar data={deptHeadcountChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Tier split</p>
            <div style={{ height: 260 }}>
              <Doughnut data={tierDonutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Manning: required vs actual</p>
            <div style={{ height: 260 }}>
              <Bar data={manningChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Weekly labour cost by department</p>
            <div style={{ height: 260 }}>
              <Bar data={costChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Headcount by shift pattern</p>
            <div style={{ height: 260 }}>
              <Bar data={shiftChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-medium text-ink">Department breakdown</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint border-b border-border">
                <th className="px-5 py-2 font-medium">Department</th>
                <th className="px-5 py-2 font-medium">Management</th>
                <th className="px-5 py-2 font-medium">Indirect</th>
                <th className="px-5 py-2 font-medium">Direct</th>
                <th className="px-5 py-2 font-medium">Actual</th>
                <th className="px-5 py-2 font-medium">Required</th>
                <th className="px-5 py-2 font-medium">Gap</th>
                <th className="px-5 py-2 font-medium">Weekly cost</th>
              </tr>
            </thead>
            <tbody>
              {manningRows.map((r) => {
                const deptActive = active.filter((e) => e.department_id === r.dept.id)
                const mgmt = deptActive.filter((e) => e.tier === 'management').length
                const ind = deptActive.filter((e) => e.tier === 'indirect').length
                const dir = deptActive.filter((e) => e.tier === 'direct').length
                const cost = weeklyCostOf(deptActive)
                return (
                  <tr key={r.dept.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 font-medium">{r.dept.name}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{mgmt}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{ind}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{dir}</td>
                    <td className="px-5 py-2.5">{r.actual}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{r.required}</td>
                    <td className="px-5 py-2.5">
                      {r.gap > 0 ? <Badge tone="critical">-{r.gap}</Badge> : r.gap < 0 ? <Badge tone="accent">+{-r.gap}</Badge> : <Badge tone="good">0</Badge>}
                    </td>
                    <td className="px-5 py-2.5 text-ink-muted">£{cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium text-ink">Holiday position</p>
            <p className="text-xs text-ink-faint mt-0.5">Holiday year runs 1 Jan – 31 Dec. "At risk" means unlikely to use full entitlement at the current pace.</p>
          </div>
          <Badge tone={atRiskCount ? 'amber' : 'good'}>{atRiskCount} at risk of {active.length}</Badge>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-faint border-b border-border">
              <th className="px-5 py-2 font-medium">Employee</th>
              <th className="px-5 py-2 font-medium">Department</th>
              <th className="px-5 py-2 font-medium">Shift</th>
              <th className="px-5 py-2 font-medium">Entitlement</th>
              <th className="px-5 py-2 font-medium">Taken</th>
              <th className="px-5 py-2 font-medium">% taken</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {holidayRows.slice(0, 25).map((r) => (
              <tr key={r.emp.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5">{r.emp.first_name} {r.emp.last_name}</td>
                <td className="px-5 py-2.5 text-ink-muted">{r.emp.department?.name ?? '—'}</td>
                <td className="px-5 py-2.5 text-ink-muted text-xs">{r.emp.shift?.name ?? '—'}</td>
                <td className="px-5 py-2.5 text-ink-muted">{r.emp.holiday_entitlement_days}d</td>
                <td className="px-5 py-2.5 text-ink-muted">{r.emp.holiday_taken_days}d</td>
                <td className="px-5 py-2.5">{r.pct}%</td>
                <td className="px-5 py-2.5"><RiskBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {holidayRows.length > 25 && (
          <p className="px-5 py-2.5 text-xs text-ink-faint">Showing the 25 most at-risk employees of {holidayRows.length} matching the current filters.</p>
        )}
      </div>
    </div>
  )
}
