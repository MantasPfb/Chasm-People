import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useSops, getSopForCapability, type SopWithCapabilities } from '@/hooks/useSops'
import { useDepartments } from '@/hooks/useEmployees'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Badge, LoadingState } from '@/components/ui/Primitives'
import { SopDetailModal } from '@/components/learning/SopDetailModal'
import { CAPABILITY_CATEGORY_LABELS, type CapabilityCategory } from '@/lib/types'

function CreateCapabilityModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CapabilityCategory>('operational_competence')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('capabilities').insert({ company_id: companyId, name, description: description || null, category })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-surface rounded-lg shadow-overlay w-full max-w-md">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-semibold text-ink">New capability</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as CapabilityCategory)}>
              {Object.entries(CAPABILITY_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create capability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CapabilityFramework() {
  const { activeCompanyId, activeMembership } = useAuth()
  const { capabilities, loading, reload } = useCapabilities(activeCompanyId)
  const { sops, reload: reloadSops } = useSops(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const [creating, setCreating] = useState(false)
  const [viewingSop, setViewingSop] = useState<SopWithCapabilities | null>(null)

  const canEdit = activeMembership?.role === 'company_admin' || activeMembership?.role === 'manager'

  if (loading) return <LoadingState />

  const categories = Object.keys(CAPABILITY_CATEGORY_LABELS) as CapabilityCategory[]

  return (
    <div>
      <PageHeader
        title="Capability Framework"
        description="The master list of capabilities that roles can require, grouped into three categories. Procedural and compliance capabilities are backed by an SOP — the documented standard an assessment is checked against."
        action={
          canEdit && (
            <button className="btn-primary" onClick={() => setCreating(true)}>
              New capability
            </button>
          )
        }
      />

      <div className="space-y-6">
        {categories.map((category) => {
          const items = capabilities.filter((c) => c.category === category)
          return (
            <div key={category} className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{CAPABILITY_CATEGORY_LABELS[category]}</p>
                <Badge>{items.length} capabilities</Badge>
              </div>
              {items.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-muted">No capabilities defined in this category yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((c) => {
                    const sop = getSopForCapability(c.id, sops)
                    return (
                      <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm text-ink font-medium">{c.name}</p>
                          {c.description && <p className="text-xs text-ink-muted mt-0.5">{c.description}</p>}
                        </div>
                        {sop ? (
                          <button className="btn-secondary !text-xs !py-1 !px-2.5" onClick={() => setViewingSop(sop)}>
                            {sop.code} →
                          </button>
                        ) : (
                          <span className="text-[11px] text-ink-faint">
                            {category === 'professional_capability' ? 'Competency-based — no SOP' : 'No SOP linked'}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-ink-faint mt-4">
        To assign a capability to a role and set its required competence level, open the role from Employee Set-up
        &amp; Roles and Responsibilities. To create or edit the procedure itself, use the SOP Library.
      </p>

      {creating && activeCompanyId && (
        <CreateCapabilityModal
          companyId={activeCompanyId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            reload()
          }}
        />
      )}
      {viewingSop && (
        <SopDetailModal
          sop={viewingSop}
          departments={departments}
          capabilities={capabilities}
          onClose={() => setViewingSop(null)}
          onSaved={reloadSops}
        />
      )}
    </div>
  )
}
