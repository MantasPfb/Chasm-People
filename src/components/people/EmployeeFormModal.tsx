import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useShifts } from '@/hooks/useShifts'
import { Badge } from '@/components/ui/Primitives'
import { PAYTYPE_LABELS, TIER_LABELS, type Department, type Employee, type Role } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

const AVATAR_COLORS = ['#2F5D5A', '#C98A3B', '#6E7173', '#3C7A5C', '#8A6FA8', '#B4483D', '#3B6E99']

function randomClockNumber() {
  return String(Math.floor(10000 + Math.random() * 90000))
}

export function EmployeeFormModal({
  companyId,
  siteId,
  departments,
  roles,
  employees,
  existing,
  onClose,
  onSaved,
}: {
  companyId: string
  siteId: string
  departments: Department[]
  roles: Role[]
  employees: EmployeeWithRefs[]
  existing?: EmployeeWithRefs
  onClose: () => void
  onSaved: () => void
}) {
  const { shifts } = useShifts(companyId)
  const [firstName, setFirstName] = useState(existing?.first_name ?? '')
  const [lastName, setLastName] = useState(existing?.last_name ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [departmentId, setDepartmentId] = useState(existing?.department_id ?? departments[0]?.id ?? '')
  const [roleId, setRoleId] = useState(existing?.role_id ?? '')
  const [managerId, setManagerId] = useState(existing?.manager_id ?? '')
  const [status, setStatus] = useState<Employee['employment_status']>(existing?.employment_status ?? 'active')
  const [shiftId, setShiftId] = useState(existing?.shift_id ?? '')
  const [contractedHours, setContractedHours] = useState(existing?.contracted_hours ?? 37.5)
  const [startDate, setStartDate] = useState(existing?.start_date ?? new Date().toISOString().slice(0, 10))
  const [holidayTakenDays, setHolidayTakenDays] = useState(existing?.holiday_taken_days ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedRole = roles.find((r) => r.id === roleId)
  const tier = selectedRole?.tier ?? 'direct'
  const payType = selectedRole?.pay_type ?? 'hourly'
  const entitlement = existing?.holiday_entitlement_days ?? (tier === 'management' ? 28 : tier === 'indirect' ? 25 : 23)

  // If the chosen role belongs to a different department, offer to follow it.
  useEffect(() => {
    const role = roles.find((r) => r.id === roleId)
    if (role?.department_id && role.department_id !== departmentId) {
      setDepartmentId(role.department_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId])

  // Default to Mon-Fri once shifts have loaded, for a brand-new employee.
  useEffect(() => {
    if (!existing && !shiftId && shifts.length > 0) {
      const mf = shifts.find((s) => s.name.includes('Mon'))
      setShiftId(mf?.id ?? shifts[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      company_id: companyId,
      site_id: siteId,
      department_id: departmentId || null,
      role_id: roleId || null,
      manager_id: managerId || null,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      employment_status: status,
      contracted_hours: contractedHours,
      start_date: startDate,
      avatar_color: existing?.avatar_color ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      tier,
      pay_type: payType,
      shift_id: shiftId || null,
      holiday_entitlement_days: entitlement,
      holiday_taken_days: holidayTakenDays,
      ...(existing ? {} : { clock_number: randomClockNumber() }),
    }

    const { error: saveError } = existing
      ? await supabase.from('employees').update(payload).eq('id', existing.id)
      : await supabase.from('employees').insert(payload)

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-surface rounded-lg shadow-overlay w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-semibold text-ink">{existing ? 'Edit employee' : 'Add employee'}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Job role</label>
              <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Unassigned</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {roleId && (
            <div className="flex gap-2">
              <Badge>{TIER_LABELS[tier]}</Badge>
              <Badge>{PAYTYPE_LABELS[payType]}</Badge>
            </div>
          )}

          <div>
            <label className="label">Reporting manager</label>
            <select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">No manager</option>
              {employees
                .filter((e) => e.id !== existing?.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Shift pattern</label>
              <select className="input" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contracted hrs/wk</label>
              <input
                type="number"
                step="0.5"
                className="input"
                value={contractedHours}
                onChange={(e) => setContractedHours(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Employee['employment_status'])}>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="left">Left</option>
              </select>
            </div>
            <div>
              <label className="label">Holiday taken this year (of {entitlement}d)</label>
              <input
                type="number"
                min={0}
                max={entitlement}
                className="input"
                value={holidayTakenDays}
                onChange={(e) => setHolidayTakenDays(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="label">Start date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Add employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
