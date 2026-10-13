import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRoleCapabilities } from '@/hooks/useCapabilities'
import { CAPABILITY_CATEGORY_LABELS, COMPETENCE_LEVELS, type Capability, type EmployeeTier, type PayType, type Role } from '@/lib/types'
import { Badge, Modal } from '@/components/ui/Primitives'
import { JobSpecification } from './JobSpecification'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

export function RoleDetailModal({
  role,
  companyId,
  departmentOptions,
  allCapabilities,
  employees,
  canEdit,
  onClose,
  onSaved,
}: {
  role: Role
  companyId: string
  departmentOptions: { id: string; name: string }[]
  allCapabilities: Capability[]
  employees: EmployeeWithRefs[]
  canEdit: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [showEdit, setShowEdit] = useState(false)
  const [title, setTitle] = useState(role.title)
  const [summary, setSummary] = useState(role.summary ?? '')
  const [responsibilities, setResponsibilities] = useState(role.responsibilities ?? '')
  const [hourlyRate, setHourlyRate] = useState(role.hourly_rate ?? 0)
  const [departmentId, setDepartmentId] = useState(role.department_id ?? '')
  const [tier, setTier] = useState<EmployeeTier>(role.tier)
  const [payType, setPayType] = useState<PayType>(role.pay_type)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { roleCapabilities, reload: reloadCaps } = useRoleCapabilities(role.id)
  const [newCapabilityId, setNewCapabilityId] = useState('')
  const [newLevel, setNewLevel] = useState(3)

  const assignedIds = new Set(roleCapabilities.map((rc) => rc.capability_id))
  const availableToAdd = allCapabilities.filter((c) => !assignedIds.has(c.id))
  const department = departmentOptions.find((d) => d.id === role.department_id) ?? null

  async function handleSaveDetails(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: saveError } = await supabase
      .from('roles')
      .update({
        title,
        summary: summary || null,
        responsibilities: responsibilities || null,
        hourly_rate: hourlyRate || null,
        department_id: departmentId || null,
        tier,
        pay_type: payType,
      })
      .eq('id', role.id)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  async function handleAddCapability() {
    if (!newCapabilityId) return
    const { error: addError } = await supabase
      .from('role_capabilities')
      .insert({ role_id: role.id, capability_id: newCapabilityId, required_level: newLevel })
    if (!addError) {
      setNewCapabilityId('')
      setNewLevel(3)
      reloadCaps()
    }
  }

  async function handleUpdateLevel(roleCapabilityId: string, level: number) {
    await supabase.from('role_capabilities').update({ required_level: level }).eq('id', roleCapabilityId)
    reloadCaps()
  }

  async function handleRemoveCapability(roleCapabilityId: string) {
    await supabase.from('role_capabilities').delete().eq('id', roleCapabilityId)
    reloadCaps()
  }

  return (
    <Modal title={role.title} onClose={onClose} width={760}>
      <div className="pb-5 border-b border-border mb-4">
        <JobSpecification role={role} department={department} employees={employees} />
      </div>

      {canEdit && (
        <button className="btn-secondary mb-4" onClick={() => setShowEdit((v) => !v)}>
          {showEdit ? 'Hide edit controls' : 'Edit role details & capabilities'}
        </button>
      )}

      {showEdit && (
        <>
          <form onSubmit={handleSaveDetails} className="space-y-4 pb-5 border-b border-border mb-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Job title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="label">Department</label>
                <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {departmentOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tier</label>
                <select className="input" value={tier} onChange={(e) => setTier(e.target.value as EmployeeTier)}>
                  <option value="management">Management</option>
                  <option value="indirect">Indirect</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
              <div>
                <label className="label">Pay type</label>
                <select className="input" value={payType} onChange={(e) => setPayType(e.target.value as PayType)}>
                  <option value="salaried">Salaried</option>
                  <option value="hourly">Hourly paid</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Job summary (purpose)</label>
              <textarea className="input" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div>
              <label className="label">Key responsibilities (one per line)</label>
              <textarea className="input" rows={6} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
            </div>
            <div className="w-48">
              <label className="label">Indicative labour rate (£/hr)</label>
              <input type="number" step="0.25" className="input" value={hourlyRate ?? 0} onChange={(e) => setHourlyRate(Number(e.target.value))} />
            </div>
            {error && <p className="text-sm text-critical">{error}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save role details'}
              </button>
            </div>
          </form>

          <p className="text-sm font-medium mb-3">Required capabilities</p>
          <div className="space-y-2 mb-4">
            {roleCapabilities.length === 0 && (
              <p className="text-sm text-ink-muted">No capabilities assigned to this role yet.</p>
            )}
            {roleCapabilities.map((rc) => {
              const cap = allCapabilities.find((c) => c.id === rc.capability_id)
              if (!cap) return null
              return (
                <div key={rc.id} className="flex items-center justify-between border border-border rounded px-3 py-2">
                  <div>
                    <p className="text-sm text-ink">{cap.name}</p>
                    <Badge>{CAPABILITY_CATEGORY_LABELS[cap.category]}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="input !w-auto text-xs py-1"
                      value={rc.required_level}
                      onChange={(e) => handleUpdateLevel(rc.id, Number(e.target.value))}
                    >
                      {COMPETENCE_LEVELS.map((l) => (
                        <option key={l.level} value={l.level}>{l.level} — {l.label}</option>
                      ))}
                    </select>
                    <button className="text-xs text-critical hover:underline" onClick={() => handleRemoveCapability(rc.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <select className="input" value={newCapabilityId} onChange={(e) => setNewCapabilityId(e.target.value)}>
                <option value="">Add a capability…</option>
                {availableToAdd.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select className="input !w-auto" value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value))}>
                {COMPETENCE_LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>Req. level {l.level}</option>
                ))}
              </select>
              <button className="btn-secondary" onClick={handleAddCapability}>Add</button>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
