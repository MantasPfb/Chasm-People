import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments, useEmployees } from '@/hooks/useEmployees'
import { useManningRequirements } from '@/hooks/useShifts'
import { Avatar, LoadingState, PageHeader } from '@/components/ui/Primitives'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

export interface VacancyNode {
  isVacancy: true
  count: number
}
export interface EmployeeNode {
  isVacancy: false
  employee: EmployeeWithRefs
  children: TreeNode[]
}
export type TreeNode = EmployeeNode | VacancyNode

export function buildOrgTree(people: EmployeeWithRefs[], vacancyByManagerId: Record<string, number> | null): EmployeeNode[] {
  const byId = new Map(people.map((e) => [e.id, e]))
  const childrenMap = new Map<string, EmployeeWithRefs[]>()
  const roots: EmployeeWithRefs[] = []

  for (const e of people) {
    if (e.manager_id && byId.has(e.manager_id)) {
      const list = childrenMap.get(e.manager_id) ?? []
      list.push(e)
      childrenMap.set(e.manager_id, list)
    } else {
      roots.push(e)
    }
  }

  function toNode(e: EmployeeWithRefs): EmployeeNode {
    const kids: TreeNode[] = (childrenMap.get(e.id) ?? [])
      .sort((a, b) => a.last_name.localeCompare(b.last_name))
      .map(toNode)
    const vacancyCount = vacancyByManagerId?.[e.id]
    if (vacancyCount && vacancyCount > 0) kids.push({ isVacancy: true, count: vacancyCount })
    return { isVacancy: false, employee: e, children: kids }
  }

  return roots.sort((a, b) => a.last_name.localeCompare(b.last_name)).map(toNode)
}

export function OrgNodeBox({ node }: { node: TreeNode }) {
  const navigate = useNavigate()
  if (node.isVacancy) {
    return (
      <div className="org-node-vacancy">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border-[1.5px] border-dashed border-critical text-[13px] font-bold flex-shrink-0">
          {node.count}
        </span>
        <div>
          <p className="text-[13px] font-semibold m-0">Vacanc{node.count === 1 ? 'y' : 'ies'}</p>
          <p className="text-[11px] m-0">Open headcount</p>
        </div>
      </div>
    )
  }
  const { employee: emp } = node
  return (
    <div className="org-node" onClick={() => navigate(`/people/directory/${emp.id}`)}>
      <Avatar firstName={emp.first_name} lastName={emp.last_name} color={emp.avatar_color} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight m-0 whitespace-nowrap">
          {emp.first_name} {emp.last_name}
        </p>
        <p className="text-[11px] text-ink-faint leading-tight m-0 whitespace-nowrap">{emp.role?.title ?? 'No role'}</p>
      </div>
    </div>
  )
}

export function OrgTreeNode({ node }: { node: TreeNode }) {
  const children = node.isVacancy ? [] : node.children
  return (
    <div className="org-root">
      <OrgNodeBox node={node} />
      {children.length > 0 && (
        <div className="org-children-wrap">
          <div className="org-children-row">
            {children.map((child, i) => (
              <div className="org-branch" key={child.isVacancy ? 'vacancy-' + i : child.employee.id}>
                <OrgTreeNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrganisationStructure() {
  const { activeCompanyId } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)
  const { departments, loading: loadingDepartments } = useDepartments(activeCompanyId)
  const { manningRequirements, loading: loadingManning } = useManningRequirements(activeCompanyId)
  const [mode, setMode] = useState<string>('management')

  const active = useMemo(() => employees.filter((e) => e.employment_status !== 'left'), [employees])

  const { treeRoots, description } = useMemo(() => {
    if (mode === 'management') {
      const managers = active.filter((e) => e.tier === 'management')
      return {
        treeRoots: buildOrgTree(managers, null),
        description:
          'Cross-department leadership structure — every management-tier employee across the site, grouped by reporting line.',
      }
    }
    const deptEmployees = active.filter((e) => e.department_id === mode)
    const dept = departments.find((d) => d.id === mode)
    const reqRow = manningRequirements.find((m) => m.department_id === mode)
    const required = reqRow ? reqRow.required_headcount : 0
    const gap = required - deptEmployees.length
    const rootManager = deptEmployees.find((e) => e.tier === 'management' && !e.manager_id)
    const vacancyByManagerId: Record<string, number> = {}
    if (gap > 0 && rootManager) vacancyByManagerId[rootManager.id] = gap
    return {
      treeRoots: buildOrgTree(deptEmployees, vacancyByManagerId),
      description:
        (dept ? dept.name : 'Department') +
        ' — full reporting structure' +
        (gap > 0 ? `, with ${gap} unfilled vacanc${gap === 1 ? 'y' : 'ies'} against the manning requirement` : '.'),
    }
  }, [mode, active, departments, manningRequirements])

  if (loadingEmployees || loadingDepartments || loadingManning) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Organisation Structure"
        description="A visual reporting tree built from each employee's assigned manager. Switch between the cross-site management view and a single department's full structure."
      />
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select className="input max-w-xs" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="management">Management overview (all departments)</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — full structure
            </option>
          ))}
        </select>
        <p className="text-sm text-ink-muted m-0">{description}</p>
      </div>
      <div className="card p-8 overflow-x-auto">
        <div className={`flex gap-12 min-w-fit ${treeRoots.length > 1 ? 'justify-start' : 'justify-center'}`}>
          {treeRoots.map((root) => (
            <OrgTreeNode key={root.employee.id} node={root} />
          ))}
        </div>
      </div>
      <div className="flex gap-4 mt-3 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-border bg-surface inline-block" /> Filled role
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-[1.5px] border-dashed border-critical inline-block" /> Vacancy / gap vs. manning requirement
        </span>
      </div>
    </div>
  )
}
