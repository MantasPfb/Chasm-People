import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments, useEmployees, useRoles } from '@/hooks/useEmployees'
import { useShifts } from '@/hooks/useShifts'
import { PageHeader, Avatar, Badge, StatusPill, LoadingState, ErrorState, EmptyState } from '@/components/ui/Primitives'
import { EmployeeFormModal } from '@/components/people/EmployeeFormModal'
import { TIER_LABELS, type EmployeeTier } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

export default function EmployeeDirectory() {
  const { activeCompanyId, activeMembership } = useAuth()
  const { employees, loading, error, reload } = useEmployees(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const { roles } = useRoles(activeCompanyId)
  const { shifts } = useShifts(activeCompanyId)

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [tierFilter, setTierFilter] = useState<EmployeeTier | ''>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalState, setModalState] = useState<'closed' | 'add' | EmployeeWithRefs>('closed')

  const canEdit = activeMembership?.role === 'company_admin' || activeMembership?.role === 'manager'

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
      if (search && !fullName.includes(search.toLowerCase()) && !(e.clock_number ?? '').includes(search)) return false
      if (departmentFilter && e.department_id !== departmentFilter) return false
      if (shiftFilter && e.shift_id !== shiftFilter) return false
      if (tierFilter && e.tier !== tierFilter) return false
      if (statusFilter && e.employment_status !== statusFilter) return false
      return true
    })
  }, [employees, search, departmentFilter, shiftFilter, tierFilter, statusFilter])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const siteId = employees[0]?.site_id

  return (
    <div>
      <PageHeader
        title="Employee Directory"
        description={`Search, filter and manage all ${employees.length} employees at the site.`}
        action={
          canEdit &&
          siteId && (
            <button className="btn-primary" onClick={() => setModalState('add')}>
              Add employee
            </button>
          )
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search by name or clock no.…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-xs" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select className="input max-w-xs" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
          <option value="">All shifts</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="input max-w-xs" value={tierFilter} onChange={(e) => setTierFilter(e.target.value as EmployeeTier | '')}>
          <option value="">All tiers</option>
          <option value="management">Management</option>
          <option value="indirect">Indirect</option>
          <option value="direct">Direct</option>
        </select>
        <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On leave</option>
          <option value="left">Left</option>
        </select>
      </div>

      <p className="text-xs text-ink-faint mb-2.5">{filtered.length} of {employees.length} employees</p>

      {filtered.length === 0 ? (
        <EmptyState title="No employees match these filters" description="Try widening your search or clearing a filter." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint border-b border-border">
                <th className="px-5 py-2.5 font-medium">Employee</th>
                <th className="px-5 py-2.5 font-medium">Department</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Tier</th>
                <th className="px-5 py-2.5 font-medium">Shift</th>
                <th className="px-5 py-2.5 font-medium">Manager</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-canvas/50">
                  <td className="px-5 py-2.5">
                    <Link to={`/people/directory/${e.id}`} className="flex items-center gap-3">
                      <Avatar firstName={e.first_name} lastName={e.last_name} color={e.avatar_color} />
                      <div>
                        <p className="text-ink font-medium">
                          {e.first_name} {e.last_name}
                        </p>
                        <p className="text-xs text-ink-faint">{e.employee_number}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{e.department?.name ?? '—'}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{e.role?.title ?? '—'}</td>
                  <td className="px-5 py-2.5"><Badge>{TIER_LABELS[e.tier]}</Badge></td>
                  <td className="px-5 py-2.5 text-ink-muted text-xs">{e.shift?.name ?? '—'}</td>
                  <td className="px-5 py-2.5 text-ink-muted">
                    {e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-2.5">
                    <StatusPill status={e.employment_status} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {canEdit && (
                      <button className="text-xs text-accent-dark hover:underline" onClick={() => setModalState(e)}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalState !== 'closed' && activeCompanyId && siteId && (
        <EmployeeFormModal
          companyId={activeCompanyId}
          siteId={siteId}
          departments={departments}
          roles={roles}
          employees={employees}
          existing={modalState === 'add' ? undefined : modalState}
          onClose={() => setModalState('closed')}
          onSaved={() => {
            setModalState('closed')
            reload()
          }}
        />
      )}
    </div>
  )
}
