import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments, useEmployees, useRoles } from '@/hooks/useEmployees'
import { useSkillsMatrix } from '@/hooks/useCapabilities'
import { Avatar, CompetenceDot, LoadingState, PageHeader, ErrorState } from '@/components/ui/Primitives'
import { CAPABILITY_CATEGORY_LABELS, type CapabilityCategory } from '@/lib/types'

export default function SkillsMatrix() {
  const { activeCompanyId } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const { roles } = useRoles(activeCompanyId)
  const { rows, loading: loadingMatrix, error } = useSkillsMatrix(activeCompanyId)

  const [departmentFilter, setDepartmentFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CapabilityCategory | ''>('')

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (e.employment_status !== 'active') return false
      if (departmentFilter && e.department_id !== departmentFilter) return false
      if (roleFilter && e.role_id !== roleFilter) return false
      return true
    })
  }, [employees, departmentFilter, roleFilter])

  const filteredEmployeeIds = useMemo(() => new Set(filteredEmployees.map((e) => e.id)), [filteredEmployees])

  const matrixRows = useMemo(
    () => rows.filter((r) => filteredEmployeeIds.has(r.employee_id) && (!categoryFilter || r.category === categoryFilter)),
    [rows, filteredEmployeeIds, categoryFilter]
  )

  const capabilityColumns = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: CapabilityCategory }>()
    for (const r of matrixRows) {
      if (!map.has(r.capability_id)) {
        map.set(r.capability_id, { id: r.capability_id, name: r.capability_name, category: r.category })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [matrixRows])

  const byEmployeeThenCapability = useMemo(() => {
    const map = new Map<string, Map<string, (typeof matrixRows)[number]>>()
    for (const r of matrixRows) {
      if (!map.has(r.employee_id)) map.set(r.employee_id, new Map())
      map.get(r.employee_id)!.set(r.capability_id, r)
    }
    return map
  }, [matrixRows])

  if (loadingEmployees || loadingMatrix) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <PageHeader
        title="Skills Matrix"
        description="Required competence versus current competence for every active employee, built live from role requirements and assessment history."
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input max-w-xs" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select className="input max-w-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <select
          className="input max-w-xs"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CapabilityCategory | '')}
        >
          <option value="">All categories</option>
          {Object.entries(CAPABILITY_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <CompetenceDot level={0} /> Not trained / critical gap
        </span>
        <span className="flex items-center gap-1.5">
          <CompetenceDot level={2} /> Partial
        </span>
        <span className="flex items-center gap-1.5">
          <CompetenceDot level={4} /> Competent
        </span>
        <span className="flex items-center gap-1.5">
          <CompetenceDot level={5} /> Trainer / assessor
        </span>
      </div>

      {capabilityColumns.length === 0 ? (
        <p className="text-sm text-ink-muted">No capability requirements match these filters.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface px-4 py-2.5 text-left font-medium text-ink-faint border-b border-r border-border min-w-[200px]">
                  Employee
                </th>
                {capabilityColumns.map((c) => (
                  <th
                    key={c.id}
                    className="px-2 py-2.5 text-center font-medium text-ink-faint border-b border-border min-w-[52px] max-w-[90px]"
                  >
                    <span className="block truncate" title={c.name}>
                      {c.name}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-center font-medium text-ink-faint border-b border-border min-w-[90px]">
                  Completion
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const empStatuses = byEmployeeThenCapability.get(emp.id)
                const allForEmployee = Array.from(empStatuses?.values() ?? [])
                const completion = allForEmployee.length
                  ? Math.round((allForEmployee.filter((s) => s.gap === 0).length / allForEmployee.length) * 100)
                  : null
                return (
                  <tr key={emp.id} className="border-b border-border last:border-0">
                    <td className="sticky left-0 bg-surface px-4 py-2 border-r border-border">
                      <Link to={`/people/directory/${emp.id}`} className="flex items-center gap-2">
                        <Avatar firstName={emp.first_name} lastName={emp.last_name} color={emp.avatar_color} />
                        <span className="text-ink text-sm whitespace-nowrap">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </Link>
                    </td>
                    {capabilityColumns.map((c) => {
                      const status = empStatuses?.get(c.id)
                      return (
                        <td key={c.id} className="px-2 py-2 text-center">
                          {status ? <CompetenceDot level={status.current_level} /> : <span className="text-ink-faint">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-center text-ink-muted">{completion !== null ? `${completion}%` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
