import { useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import '@/lib/chartSetup'
import { useAuth } from '@/hooks/useAuth'
import { useCapabilities, useSkillsMatrix } from '@/hooks/useCapabilities'
import { useEmployees } from '@/hooks/useEmployees'
import { useSops } from '@/hooks/useSops'
import { sopReviewStatus } from '@/lib/sop'
import { Badge, CompetenceDot, LoadingState, PageHeader, StatCard, ViewToggle } from '@/components/ui/Primitives'
import { CAPABILITY_CATEGORY_LABELS } from '@/lib/types'

export default function LearningOverview() {
  const { activeCompanyId } = useAuth()
  const { capabilities, loading: loadingCaps } = useCapabilities(activeCompanyId)
  const { rows, loading: loadingMatrix } = useSkillsMatrix(activeCompanyId)
  const { employees } = useEmployees(activeCompanyId)
  const { sops } = useSops(activeCompanyId)

  const [capabilityFilter, setCapabilityFilter] = useState('')
  const [view, setView] = useState<'charts' | 'table'>('charts')

  const categories = Object.keys(CAPABILITY_CATEGORY_LABELS) as (keyof typeof CAPABILITY_CATEGORY_LABELS)[]
  const categoryStats = useMemo(() => {
    return categories.map((category) => {
      const catRows = rows.filter((r) => r.category === category)
      const met = catRows.filter((r) => r.gap === 0).length
      const gaps = catRows.filter((r) => r.gap > 0).length
      return { category, label: CAPABILITY_CATEGORY_LABELS[category], total: catRows.length, met, gaps }
    })
  }, [rows])

  const totalGaps = rows.filter((r) => r.gap > 0).length
  const criticalGaps = rows.filter((r) => r.gap >= 2).length
  const overallCoverage = rows.length ? Math.round((rows.filter((r) => r.gap === 0).length / rows.length) * 100) : 0

  const linkedSopCount = sops.filter((s) => s.capability_ids.length > 0).length
  const processSopCount = sops.filter((s) => s.capability_ids.length === 0).length
  const sopReviewCounts = useMemo(() => {
    const counts = { good: 0, amber: 0, critical: 0 }
    sops.forEach((s) => {
      counts[sopReviewStatus(s.review_due).tone]++
    })
    return counts
  }, [sops])

  const empByDept = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach((e) => {
      if (e.department_id) map.set(e.id, e.department_id)
    })
    return map
  }, [employees])
  const deptNameById = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach((e) => {
      if (e.department_id && e.department?.name) map.set(e.department_id, e.department.name)
    })
    return map
  }, [employees])

  const deptCoverage = useMemo(() => {
    const byDept = new Map<string, { required: number; met: number }>()
    rows.forEach((r) => {
      const deptId = empByDept.get(r.employee_id)
      if (!deptId) return
      const cur = byDept.get(deptId) ?? { required: 0, met: 0 }
      cur.required++
      if (r.gap === 0) cur.met++
      byDept.set(deptId, cur)
    })
    return Array.from(byDept.entries())
      .map(([deptId, v]) => ({ name: deptNameById.get(deptId) ?? 'Unknown', pct: v.required ? Math.round((v.met / v.required) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
  }, [rows, empByDept, deptNameById])

  const gapLeaderboard = useMemo(() => {
    const byCapability = new Map<string, number>()
    rows.filter((r) => r.gap > 0).forEach((r) => {
      byCapability.set(r.capability_name, (byCapability.get(r.capability_name) ?? 0) + 1)
    })
    return Array.from(byCapability.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [rows])

  const spotlightCapability = capabilityFilter ? capabilities.find((c) => c.id === capabilityFilter) : null
  const spotlightRows = spotlightCapability ? rows.filter((r) => r.capability_id === spotlightCapability.id) : []
  const spotlightMet = spotlightRows.filter((r) => r.gap === 0).length
  const spotlightGapRows = spotlightRows.filter((r) => r.gap > 0)

  const deptCoverageChartData = {
    labels: deptCoverage.map((d) => d.name),
    datasets: [{ label: 'Coverage %', backgroundColor: '#406FB6', data: deptCoverage.map((d) => d.pct) }],
  }
  const categoryChartData = {
    labels: categoryStats.map((c) => c.label),
    datasets: [{ data: categoryStats.map((c) => (c.total ? Math.round((c.met / c.total) * 100) : 0)), backgroundColor: ['#B7302F', '#8A6FA8', '#23764C'] }],
  }
  const gapChartData = {
    labels: gapLeaderboard.map(([name]) => name),
    datasets: [{ label: 'Employees with a gap', backgroundColor: '#C98A3B', data: gapLeaderboard.map(([, count]) => count) }],
  }
  const sopReviewChartData = {
    labels: ['Current', 'Review due soon', 'Overdue'],
    datasets: [{ data: [sopReviewCounts.good, sopReviewCounts.amber, sopReviewCounts.critical], backgroundColor: ['#23764C', '#A2660C', '#B7302F'] }],
  }

  if (loadingCaps || loadingMatrix) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="L&D Overview"
        description="Capability coverage, SOP health and training completions across the site — filter by department, skill or category to drill in."
      />

      <div className="flex flex-wrap gap-2.5 items-center justify-between mb-5">
        <select className="input max-w-[260px]" value={capabilityFilter} onChange={(e) => setCapabilityFilter(e.target.value)}>
          <option value="">Spotlight a skill…</option>
          {capabilities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <ViewToggle view={view} setView={setView} />
      </div>

      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <StatCard label="Overall coverage" value={`${overallCoverage}%`} tone={overallCoverage < 70 ? 'amber' : 'good'} />
        <StatCard label="Capabilities defined" value={String(capabilities.length)} />
        <StatCard label="SOPs (linked / process)" value={`${linkedSopCount} / ${processSopCount}`} />
        <StatCard label="Open gaps" value={String(totalGaps)} tone={totalGaps ? 'amber' : 'good'} />
        <StatCard label="Critical gaps (2+)" value={String(criticalGaps)} tone={criticalGaps ? 'critical' : 'good'} />
      </div>

      {spotlightCapability && (
        <div className="card p-5 mb-6" style={{ borderColor: '#2F5D5A' }}>
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <Badge tone="accent">{CAPABILITY_CATEGORY_LABELS[spotlightCapability.category]}</Badge>
              <p className="text-base font-bold mt-1.5 mb-0.5">{spotlightCapability.name}</p>
              <p className="text-sm text-ink-muted mt-1 mb-0 max-w-md">{spotlightCapability.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold m-0">{spotlightRows.length ? Math.round((spotlightMet / spotlightRows.length) * 100) : 0}%</p>
              <p className="text-xs text-ink-faint m-0">{spotlightMet} of {spotlightRows.length} met</p>
            </div>
          </div>
          {spotlightGapRows.length > 0 && (
            <div className="mt-3.5 pt-3.5 border-t border-border">
              <p className="text-xs font-semibold text-ink-muted mb-2">{spotlightGapRows.length} people with a gap</p>
              <div className="flex flex-wrap gap-2">
                {spotlightGapRows.slice(0, 10).map((r) => {
                  const emp = employees.find((e) => e.id === r.employee_id)
                  return (
                    <span key={r.employee_id} className="inline-flex items-center gap-1.5 text-xs bg-canvas rounded px-2 py-1">
                      {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'} <CompetenceDot level={r.current_level} /> → <CompetenceDot level={r.required_level} />
                    </span>
                  )
                })}
                {spotlightGapRows.length > 10 && <span className="text-xs text-ink-faint">+{spotlightGapRows.length - 10} more</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'charts' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Coverage by department</p>
            <div style={{ height: 240 }}>
              <Bar data={deptCoverageChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Coverage by category</p>
            <div style={{ height: 240 }}>
              <Doughnut data={categoryChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">Top skill gaps (by capability)</p>
            <div style={{ height: 240 }}>
              <Bar data={gapChartData} options={{ indexAxis: 'y' as const, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold mb-3">SOP review status</p>
            <div style={{ height: 240 }}>
              <Doughnut data={sopReviewChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-medium text-ink">Coverage by capability category</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint border-b border-border">
                <th className="px-5 py-2 font-medium">Category</th>
                <th className="px-5 py-2 font-medium">Requirements</th>
                <th className="px-5 py-2 font-medium">Met</th>
                <th className="px-5 py-2 font-medium">Gaps</th>
                <th className="px-5 py-2 font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((c) => (
                <tr key={c.category} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-ink">{c.label}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{c.total}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{c.met}</td>
                  <td className="px-5 py-2.5">{c.gaps > 0 ? <Badge tone="amber">{c.gaps}</Badge> : <Badge tone="good">0</Badge>}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{c.total ? Math.round((c.met / c.total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
