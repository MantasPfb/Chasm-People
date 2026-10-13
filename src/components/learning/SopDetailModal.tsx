import { useState, type FormEvent } from 'react'
import { Badge, Modal } from '@/components/ui/Primitives'
import { updateSop, type SopWithCapabilities } from '@/hooks/useSops'
import { sopReviewStatus } from '@/lib/sop'
import { CAPABILITY_CATEGORY_LABELS } from '@/lib/types'
import type { Capability, Department } from '@/lib/types'

export function SopDetailModal({
  sop,
  departments,
  capabilities,
  onClose,
  onSaved,
}: {
  sop: SopWithCapabilities
  departments: Department[]
  capabilities: Capability[]
  onClose: () => void
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(sop.title)
  const [version, setVersion] = useState(sop.version)
  const [owner, setOwner] = useState(sop.owner ?? '')
  const [summary, setSummary] = useState(sop.summary ?? '')
  const [steps, setSteps] = useState(sop.steps.join('\n'))
  const [reviewDue, setReviewDue] = useState(sop.review_due ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkedCapabilities = sop.capability_ids.map((id) => capabilities.find((c) => c.id === id)).filter(Boolean) as Capability[]
  const dept = departments.find((d) => d.id === sop.department_id)
  const reviewStatus = sopReviewStatus(sop.review_due)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateSop({ ...sop, title, version, owner, summary, steps: steps.split('\n').filter(Boolean), review_due: reviewDue })
      onSaved()
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this SOP.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`${sop.code} — ${sop.title}`} onClose={onClose} width={640}>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        <Badge tone="accent">{dept ? dept.name : 'Unassigned'}</Badge>
        <Badge>{sop.version}</Badge>
        <Badge tone={reviewStatus.tone}>{reviewStatus.label}</Badge>
      </div>

      {!editing ? (
        <>
          <p className="text-sm leading-relaxed mb-5">{sop.summary}</p>

          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Procedure</p>
          <ol className="pl-5 space-y-1.5 mb-5">
            {sop.steps.map((s, i) => (
              <li key={i} className="text-[13.5px] leading-relaxed">
                {s}
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="card p-4">
              <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wide mb-2.5">Document control</p>
              <Row label="Owner" value={sop.owner ?? '—'} />
              <Row label="Last reviewed" value={new Date(sop.last_reviewed + 'T00:00:00').toLocaleDateString('en-GB')} />
              <Row label="Review due" value={sop.review_due ? new Date(sop.review_due + 'T00:00:00').toLocaleDateString('en-GB') : '—'} />
            </div>
            <div className="card p-4">
              <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wide mb-2.5">Drives competence for</p>
              <Row
                label="Linked capability"
                value={linkedCapabilities.length ? linkedCapabilities.map((c) => c.name).join(', ') : 'None — process SOP'}
              />
              {linkedCapabilities.length > 0 && (
                <Row label="Category" value={CAPABILITY_CATEGORY_LABELS[linkedCapabilities[0].category]} />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              Edit SOP
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-[2fr_1fr] gap-3.5">
            <div>
              <label className="label">Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Version</label>
              <input className="input" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Owner</label>
            <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
          <div>
            <label className="label">Summary</label>
            <textarea className="input" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div>
            <label className="label">Procedure steps (one per line)</label>
            <textarea className="input" rows={6} value={steps} onChange={(e) => setSteps(e.target.value)} />
          </div>
          <div className="max-w-[200px]">
            <label className="label">Review due</label>
            <input type="date" className="input" value={reviewDue} onChange={(e) => setReviewDue(e.target.value)} />
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save SOP'}
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
