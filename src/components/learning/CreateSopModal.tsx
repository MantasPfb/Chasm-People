import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Primitives'
import { createSop, type SopWithCapabilities } from '@/hooks/useSops'
import type { Capability, Department } from '@/lib/types'

export function CreateSopModal({
  companyId,
  departments,
  capabilities,
  existingSops,
  onClose,
  onCreated,
}: {
  companyId: string
  departments: Department[]
  capabilities: Capability[]
  existingSops: SopWithCapabilities[]
  onClose: () => void
  onCreated: () => void
}) {
  const linkedIds = new Set(existingSops.flatMap((s) => s.capability_ids))
  const availableCapabilities = capabilities.filter((c) => c.category !== 'professional_capability' && !linkedIds.has(c.id))
  const nextCode = 'SOP-' + String(existingSops.length + 1).padStart(3, '0')

  const [title, setTitle] = useState('')
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '')
  const [owner, setOwner] = useState('')
  const [summary, setSummary] = useState('')
  const [steps, setSteps] = useState('')
  const [capabilityId, setCapabilityId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createSop({
        companyId,
        departmentId,
        code: nextCode,
        title,
        owner,
        summary,
        steps: steps.split('\n').filter(Boolean),
        capabilityId: capabilityId || null,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this SOP.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New SOP" onClose={onClose} width={560}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <p className="text-xs text-ink-faint m-0">This will be created as {nextCode}.</p>
        <div>
          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Linked capability (optional)</label>
          <select className="input" value={capabilityId} onChange={(e) => setCapabilityId(e.target.value)}>
            <option value="">— No linked capability (process SOP) —</option>
            {availableCapabilities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-faint mt-1">
            Only link a capability if this SOP defines a standard individuals are assessed against — departmental
            process documents don't need one.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="label">Owning department</label>
            <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Owner (role/person)</label>
            <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Summary</label>
          <textarea className="input" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div>
          <label className="label">Procedure steps (one per line)</label>
          <textarea className="input" rows={5} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </div>
        {error && <p className="text-sm text-critical">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create SOP'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
