import { useState, type FormEvent } from 'react'
import { Modal, Badge } from '@/components/ui/Primitives'
import { completeReturnToWork } from '@/hooks/useAbsence'
import type { AbsenceRecord, ReturnToWorkForm } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

function addDaysToDateString(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function ReturnToWorkModal({
  absence,
  employee,
  onClose,
  onSaved,
}: {
  absence: AbsenceRecord
  employee: EmployeeWithRefs
  onClose: () => void
  onSaved: () => void
}) {
  const existing = absence.rtw
  const [editing, setEditing] = useState(!absence.return_to_work_completed)
  const [interviewDate, setInterviewDate] = useState(existing?.interviewDate ?? addDaysToDateString(absence.end_date, 1))
  const [reasonConfirmed, setReasonConfirmed] = useState(existing?.reasonConfirmed ?? absence.reason ?? '')
  const [support, setSupport] = useState(existing?.support ?? '')
  const [conductedBy, setConductedBy] = useState(existing?.conductedBy ?? '')
  const [fitToReturn, setFitToReturn] = useState(existing?.fitToReturn ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form: ReturnToWorkForm = { interviewDate, reasonConfirmed, support, conductedBy, fitToReturn }
    try {
      await completeReturnToWork(absence.id, form)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the return-to-work form.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Return to Work — ${employee.first_name} ${employee.last_name}`} onClose={onClose} width={520}>
      <div className="card p-3.5 mb-4">
        <Row label="Absence dates" value={`${new Date(absence.start_date + 'T00:00:00').toLocaleDateString('en-GB')} – ${new Date(absence.end_date + 'T00:00:00').toLocaleDateString('en-GB')}`} />
        <Row label="Days" value={String(absence.days)} />
        <Row label="Type" value={absence.type === 'sickness' ? 'Sickness (authorised)' : 'Unauthorised absence'} />
      </div>

      {!editing && existing ? (
        <div>
          <Badge tone="good">Return-to-work form completed</Badge>
          <div className="mt-3.5">
            <Row label="Interview date" value={new Date(existing.interviewDate + 'T00:00:00').toLocaleDateString('en-GB')} />
            <Row label="Conducted by" value={existing.conductedBy} />
            <Row label="Fit to return" value={existing.fitToReturn ? 'Yes' : 'No — referred for further support'} />
          </div>
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mt-3.5 mb-1.5">Reason confirmed</p>
          <p className="text-sm m-0">{existing.reasonConfirmed}</p>
          {existing.support && (
            <>
              <p className="text-[11px] font-bold text-accent uppercase tracking-wide mt-3.5 mb-1.5">Support / adjustments agreed</p>
              <p className="text-sm m-0">{existing.support}</p>
            </>
          )}
          <div className="flex justify-end mt-5">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              Edit form
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="label">Interview date</label>
              <input type="date" className="input" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Conducted by</label>
              <input className="input" value={conductedBy} onChange={(e) => setConductedBy(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Reason confirmed with employee</label>
            <textarea className="input" rows={2} value={reasonConfirmed} onChange={(e) => setReasonConfirmed(e.target.value)} />
          </div>
          <div>
            <label className="label">Support / adjustments agreed (optional)</label>
            <textarea className="input" rows={2} value={support} onChange={(e) => setSupport(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fit-to-return"
              checked={fitToReturn}
              onChange={(e) => setFitToReturn(e.target.checked)}
            />
            <label htmlFor="fit-to-return" className="text-sm">
              Employee confirmed fit to return to normal duties
            </label>
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div className="flex justify-end gap-2">
            {absence.return_to_work_completed && (
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save return-to-work form'}
            </button>
          </div>
        </form>
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
