import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, DisciplinaryBadge, LoadingState, Modal, RiskBadge } from '@/components/ui/Primitives'
import { useAbsenceRecords } from '@/hooks/useAbsence'
import { holidayRiskStatus } from '@/lib/holiday'
import { ReturnToWorkModal } from './ReturnToWorkModal'
import type { EmployeeAbsenceSummary } from '@/lib/types'
import type { AbsenceRecord } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

export function EmployeeAbsenceDetailModal({
  employee,
  summary,
  onClose,
}: {
  employee: EmployeeWithRefs
  summary: EmployeeAbsenceSummary | undefined
  onClose: () => void
}) {
  const { records, loading, reload } = useAbsenceRecords(employee.id)
  const [rtwAbsence, setRtwAbsence] = useState<AbsenceRecord | null>(null)

  const holidayPct = Math.round((employee.holiday_taken_days / employee.holiday_entitlement_days) * 100)
  const holidayStatus = holidayRiskStatus(employee.holiday_entitlement_days, employee.holiday_taken_days)

  return (
    <Modal title={`${employee.first_name} ${employee.last_name}`} onClose={onClose} width={680}>
      <div className="flex items-center gap-3 mb-4">
        <Avatar firstName={employee.first_name} lastName={employee.last_name} color={employee.avatar_color} />
        <div>
          <p className="text-sm text-ink-muted m-0">
            {employee.role?.title ?? '—'} · {employee.department?.name ?? '—'} · Clock {employee.clock_number}
          </p>
          <Link to={`/people/directory/${employee.id}`} className="text-xs text-accent hover:underline">
            View full profile →
          </Link>
        </div>
      </div>

      {summary?.disciplinary_stage && (
        <div className="card p-3.5 mb-4" style={{ borderColor: 'var(--critical)' }}>
          <div className="mb-1">
            <DisciplinaryBadge stage={summary.disciplinary_stage} />
          </div>
          <p className="text-sm text-ink-muted m-0">
            {summary.instances_12mo} absence instance{summary.instances_12mo === 1 ? '' : 's'} in the last 12 months
            triggers this stage under the site's attendance policy.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card p-4">
          <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wide mb-2.5">Holiday (1 Jan – 31 Dec)</p>
          <Row label="Entitlement" value={`${employee.holiday_entitlement_days}d`} />
          <Row label="Taken YTD" value={`${employee.holiday_taken_days}d`} />
          <Row label="% outstanding" value={`${100 - holidayPct}%`} />
          <div className="mt-2">
            <RiskBadge status={holidayStatus} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wide mb-2.5">Absence — last 12 months</p>
          <Row label="Total days" value={String(summary?.days_12mo ?? 0)} />
          <Row label="Instances" value={String(summary?.instances_12mo ?? 0)} />
          <Row label="RTW outstanding" value={String(summary?.outstanding_rtw ?? 0)} />
        </div>
      </div>

      <p className="text-sm font-semibold mb-2.5">Absence instances</p>
      {loading ? (
        <LoadingState />
      ) : records.length === 0 ? (
        <p className="text-sm text-ink-muted">No absences recorded in the last 12 months.</p>
      ) : (
        <div className="card overflow-hidden">
          <table>
            <thead>
              <tr className="text-left text-ink-faint border-b border-border">
                <th className="px-4 py-2 font-medium text-xs">Dates</th>
                <th className="px-4 py-2 font-medium text-xs">Days</th>
                <th className="px-4 py-2 font-medium text-xs">Type</th>
                <th className="px-4 py-2 font-medium text-xs">Reason</th>
                <th className="px-4 py-2 font-medium text-xs">Return to work</th>
              </tr>
            </thead>
            <tbody>
              {records.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-sm">
                    {new Date(a.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {a.start_date !== a.end_date &&
                      ` – ${new Date(a.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                  </td>
                  <td className="px-4 py-2 text-sm text-ink-muted">{a.days}</td>
                  <td className="px-4 py-2">
                    <Badge tone={a.type === 'sickness' ? 'critical' : 'amber'}>
                      {a.type === 'sickness' ? 'Sickness' : 'Unauthorised'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-sm text-ink-muted">{a.reason}</td>
                  <td className="px-4 py-2">
                    {a.return_to_work_completed ? (
                      <button className="text-xs text-good hover:underline" onClick={() => setRtwAbsence(a)}>
                        ✓ Completed — view
                      </button>
                    ) : (
                      <button className="btn-secondary !text-xs !py-1 !px-2.5" onClick={() => setRtwAbsence(a)}>
                        Complete RTW form
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rtwAbsence && (
        <ReturnToWorkModal
          absence={rtwAbsence}
          employee={employee}
          onClose={() => setRtwAbsence(null)}
          onSaved={reload}
        />
      )}
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm mb-2 last:mb-0">
      <span className="text-ink-faint">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
