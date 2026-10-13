import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useEmployeeCapabilityProfile } from '@/hooks/useCapabilities'
import { Avatar, Badge, CompetenceDot, LoadingState, RiskBadge, StatusPill } from '@/components/ui/Primitives'
import { holidayRiskStatus } from '@/lib/holiday'
import { CAPABILITY_CATEGORY_LABELS, PAYTYPE_LABELS, TIER_LABELS } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

export default function EmployeeProfile() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const [employee, setEmployee] = useState<EmployeeWithRefs | null>(null)
  const [loading, setLoading] = useState(true)
  const { statuses, history, loading: loadingCapabilities } = useEmployeeCapabilityProfile(employeeId ?? null)

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    supabase
      .from('employees')
      .select(`*, department:departments(*), role:roles(*), manager:manager_id(id, first_name, last_name), shift:shift_id(*)`)
      .eq('id', employeeId)
      .maybeSingle()
      .then(({ data }) => {
        setEmployee((data as unknown as EmployeeWithRefs) ?? null)
        setLoading(false)
      })
  }, [employeeId])

  if (loading) return <LoadingState />
  if (!employee) return <p className="text-sm text-ink-muted">Employee not found.</p>

  const metCount = statuses.filter((s) => s.gap === 0).length
  const completion = statuses.length ? Math.round((metCount / statuses.length) * 100) : null

  return (
    <div>
      <Link to="/people/directory" className="text-sm text-ink-muted hover:text-ink mb-4 inline-block">
        ← Back to directory
      </Link>

      <div className="card p-6 mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Avatar firstName={employee.first_name} lastName={employee.last_name} color={employee.avatar_color} />
          <div>
            <p className="text-lg font-semibold text-ink">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-sm text-ink-muted">{employee.role?.title ?? 'No role assigned'}</p>
            <div className="flex gap-1.5 mt-2">
              <Badge>{TIER_LABELS[employee.tier]}</Badge>
              <Badge>{PAYTYPE_LABELS[employee.pay_type]}</Badge>
            </div>
          </div>
        </div>
        <StatusPill status={employee.employment_status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-medium text-ink-muted mb-3">Employment</p>
          <dl className="space-y-2 text-sm">
            <Row label="Employee no." value={employee.employee_number ?? '—'} />
            <Row label="Clock number" value={employee.clock_number ?? '—'} />
            <Row label="Department" value={employee.department?.name ?? '—'} />
            <Row label="Job role" value={employee.role?.title ?? '—'} />
            <Row
              label="Reporting manager"
              value={employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : '—'}
            />
            <Row label="Start date" value={new Date(employee.start_date).toLocaleDateString('en-GB')} />
          </dl>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-ink-muted mb-3">Hours, shift & pay</p>
          <dl className="space-y-2 text-sm">
            <Row label="Shift pattern" value={employee.shift?.name ?? '—'} />
            <Row label="Contracted hours / wk" value={String(employee.contracted_hours)} />
            <Row
              label="Labour rate (from role)"
              value={employee.role?.hourly_rate ? `£${Number(employee.role.hourly_rate).toFixed(2)} / hr` : '—'}
            />
            <Row label="Contact email" value={employee.email ?? '—'} />
          </dl>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-ink-muted mb-3">Holiday (1 Jan – 31 Dec)</p>
          <dl className="space-y-2 text-sm">
            <Row label="Entitlement" value={`${employee.holiday_entitlement_days}d`} />
            <Row label="Taken" value={`${employee.holiday_taken_days}d`} />
            <Row
              label="% taken"
              value={`${Math.round((employee.holiday_taken_days / employee.holiday_entitlement_days) * 100)}%`}
            />
          </dl>
          <div className="mt-2.5">
            <RiskBadge status={holidayRiskStatus(employee.holiday_entitlement_days, employee.holiday_taken_days)} />
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-ink-muted mb-3">Capability overview</p>
          {completion === null ? (
            <p className="text-sm text-ink-faint">No role capabilities defined yet.</p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-ink">{completion}%</p>
              <p className="text-xs text-ink-faint mt-1">
                {metCount} of {statuses.length} required capabilities met
              </p>
            </>
          )}
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium text-ink">Required vs current capability</p>
        </div>
        {loadingCapabilities ? (
          <LoadingState />
        ) : statuses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">This role has no capability requirements defined yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint border-b border-border">
                <th className="px-5 py-2.5 font-medium">Capability</th>
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 font-medium">Required</th>
                <th className="px-5 py-2.5 font-medium">Current</th>
                <th className="px-5 py-2.5 font-medium">Gap</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <tr key={s.capability_id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-ink">{s.capability_name}</td>
                  <td className="px-5 py-2.5">
                    <Badge>{CAPABILITY_CATEGORY_LABELS[s.category]}</Badge>
                  </td>
                  <td className="px-5 py-2.5">
                    <CompetenceDot level={s.required_level} />
                  </td>
                  <td className="px-5 py-2.5">
                    <CompetenceDot level={s.current_level} />
                  </td>
                  <td className="px-5 py-2.5">
                    {s.gap === 0 ? <Badge tone="good">Met</Badge> : <Badge tone="critical">Gap of {s.gap}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium text-ink">Assessment history</p>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">No assessments recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint border-b border-border">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Level achieved</th>
                <th className="px-5 py-2.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 15).map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-ink-muted">{new Date(a.assessed_at).toLocaleDateString('en-GB')}</td>
                  <td className="px-5 py-2.5">
                    <CompetenceDot level={a.level_achieved} />
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{a.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-ink font-medium">{value}</dd>
    </div>
  )
}
