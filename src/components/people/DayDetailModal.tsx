import { useState } from 'react'
import { Avatar, Badge, Modal } from '@/components/ui/Primitives'
import { ATTENDANCE_STATUS_META, type AttendanceStatus } from '@/lib/types'
import { getActualTimes } from '@/lib/shiftRotation'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

function varianceNote(variance: number, kind: 'in' | 'out') {
  if (kind === 'in') {
    if (variance > 10) return { text: `Late by ${variance} min`, tone: 'critical' as const }
    if (variance > 3) return { text: `${variance} min late`, tone: 'amber' as const }
    if (variance < -10) return { text: `${Math.abs(variance)} min early`, tone: 'good' as const }
    return { text: 'On time', tone: 'good' as const }
  }
  if (variance < -10) return { text: `Left ${Math.abs(variance)} min early`, tone: 'critical' as const }
  if (variance < -3) return { text: `${Math.abs(variance)} min early`, tone: 'amber' as const }
  if (variance > 10) return { text: `${variance} min over`, tone: 'default' as const }
  return { text: 'On time', tone: 'good' as const }
}

export function DayDetailModal({
  employee,
  dateKey,
  currentStatus,
  onClose,
  onSave,
}: {
  employee: EmployeeWithRefs
  dateKey: string
  currentStatus: AttendanceStatus
  onClose: () => void
  onSave: (status: AttendanceStatus) => void
}) {
  const [status, setStatus] = useState<AttendanceStatus>(currentStatus)
  const date = new Date(dateKey + 'T00:00:00')
  const isWorking = status === 'working'
  const actual = isWorking && employee.shift ? getActualTimes(employee.id, employee.shift.name, dateKey) : null
  const inNote = actual ? varianceNote(actual.inVarianceMin, 'in') : null
  const outNote = actual ? varianceNote(actual.outVarianceMin, 'out') : null

  return (
    <Modal
      title={`${employee.first_name} ${employee.last_name} — ${date.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })}`}
      onClose={onClose}
      width={520}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <Avatar firstName={employee.first_name} lastName={employee.last_name} color={employee.avatar_color} />
        <p className="text-sm text-ink-muted m-0">
          Clock no. {employee.clock_number} · {employee.shift?.name ?? '—'}
        </p>
      </div>

      <div className="flex items-center gap-2.5 mb-5">
        <label className="label !mb-0">Day status</label>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
          {Object.entries(ATTENDANCE_STATUS_META).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
      </div>

      {isWorking && actual ? (
        <div className="grid grid-cols-2 gap-5">
          <div className="card p-4">
            <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wide mb-2.5">Scheduled (required)</p>
            <Row label="Clock in" value={actual.scheduledStart} />
            <Row label="Clock out" value={actual.scheduledEnd} />
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wide mb-2.5">Actual (clocked)</p>
            <Row label="Clock in" value={actual.clockIn} />
            <Row label="Clock out" value={actual.clockOut} />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {inNote && <Badge tone={inNote.tone}>{inNote.text}</Badge>}
              {outNote && <Badge tone={outNote.tone}>{outNote.text}</Badge>}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <p className="text-sm text-ink-muted m-0">
            No clock-in is required — this day is recorded as <strong>{ATTENDANCE_STATUS_META[status].label}</strong>.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(status)}>Save status</button>
      </div>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm mb-2">
      <span className="text-ink-faint">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
