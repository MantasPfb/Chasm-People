import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments, useEmployees, useRoles } from '@/hooks/useEmployees'
import { useCapabilities } from '@/hooks/useCapabilities'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Badge, LoadingState } from '@/components/ui/Primitives'
import { RoleDetailModal } from '@/components/people/RoleDetailModal'
import { PAYTYPE_LABELS, TIER_LABELS, type EmployeeTier, type PayType, type Role } from '@/lib/types'

function CreateRoleModal({
  companyId,
  departments,
  onClose,
  onCreated,
}: {
  companyId: string
  departments: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '')
  const [tier, setTier] = useState<EmployeeTier>('direct')
  const [payType, setPayType] = useState<PayType>('hourly')
  const [hourlyRate, setHourlyRate] = useState(15)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('roles').insert({
      company_id: companyId,
      title,
      department_id: departmentId || null,
      hourly_rate: hourlyRate,
      tier,
      pay_type: payType,
    })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-surface rounded-lg shadow-overlay w-full max-w-md">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-semibold text-ink">New job role</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Job title</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
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
            <label className="label">Indicative labour rate (£/hr)</label>
            <input type="number" step="0.25" className="input" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RolesPage() {
  const { activeCompanyId, activeMembership } = useAuth()
  const { roles, loading, reload } = useRoles(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const { employees } = useEmployees(activeCompanyId)
  const { capabilities } = useCapabilities(activeCompanyId)

  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [deptFilter, setDeptFilter] = useState('')

  const canEdit = activeMembership?.role === 'company_admin' || activeMembership?.role === 'manager'
  const visibleRoles = deptFilter ? roles.filter((r) => r.department_id === deptFilter) : roles

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Employee Set-up & Roles and Responsibilities"
        description="The full job specification for every role on site — purpose, key responsibilities, person specification and measures of success — alongside tier, pay classification, labour rate and required capabilities."
        action={
          canEdit && (
            <button className="btn-primary" onClick={() => setCreating(true)}>
              New role
            </button>
          )
        }
      />

      <div className="mb-4">
        <select className="input max-w-[220px]" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleRoles.map((role) => {
          const headcount = employees.filter((e) => e.role_id === role.id && e.employment_status === 'active').length
          const dept = departments.find((d) => d.id === role.department_id)
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className="card p-5 text-left hover:border-accent/40 transition-colors"
            >
              <p className="text-sm font-semibold text-ink">{role.title}</p>
              <p className="text-xs text-ink-faint mt-0.5">{dept?.name ?? 'Unassigned department'}</p>
              <div className="flex gap-1.5 mt-2">
                <Badge>{TIER_LABELS[role.tier]}</Badge>
                <Badge>{PAYTYPE_LABELS[role.pay_type]}</Badge>
              </div>
              {role.summary && <p className="text-xs text-ink-muted mt-2 line-clamp-2">{role.summary}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-ink-muted">
                <span>{headcount} employees</span>
                <span>{role.hourly_rate ? `£${Number(role.hourly_rate).toFixed(2)}/hr equiv.` : 'Rate not set'}</span>
              </div>
            </button>
          )
        })}
      </div>

      {selectedRole && activeCompanyId && (
        <RoleDetailModal
          role={selectedRole}
          companyId={activeCompanyId}
          departmentOptions={departments}
          allCapabilities={capabilities}
          employees={employees}
          canEdit={canEdit}
          onClose={() => setSelectedRole(null)}
          onSaved={() => {
            reload()
            setSelectedRole(null)
          }}
        />
      )}

      {creating && activeCompanyId && (
        <CreateRoleModal
          companyId={activeCompanyId}
          departments={departments}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            reload()
          }}
        />
      )}
    </div>
  )
}
