import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEmployees } from '@/hooks/useEmployees'
import { useShifts } from '@/hooks/useShifts'
import { Badge, LoadingState, PageHeader, StatCard } from '@/components/ui/Primitives'
import { buildOrgTree, OrgTreeNode } from './OrganisationStructure'
import { buildRotationStrip, isOnShiftOnDate, nextTransition, SHIFT_PATTERN_IDS } from '@/lib/shiftRotation'

export default function ShiftsDashboard() {
  const { activeCompanyId } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)
  const { shifts, loading: loadingShifts } = useShifts(activeCompanyId)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)

  const today = new Date()
  const effectiveShiftId = selectedShiftId ?? shifts.find((s) => s.name === SHIFT_PATTERN_IDS.DAY_A)?.id ?? shifts[0]?.id ?? null
  const selectedShift = shifts.find((s) => s.id === effectiveShiftId) ?? null

  const statusByShift = useMemo(
    () =>
      shifts.map((s) => ({
        shift: s,
        onToday: isOnShiftOnDate(s.name, today),
        headcount: employees.filter((e) => e.shift_id === s.id && e.employment_status === 'active').length,
      })),
    [shifts, employees]
  )

  const roster = useMemo(
    () => employees.filter((e) => e.shift_id === effectiveShiftId && e.employment_status === 'active'),
    [employees, effectiveShiftId]
  )

  const onToday = selectedShift ? isOnShiftOnDate(selectedShift.name, today) : false
  const isMonFri = selectedShift?.name === SHIFT_PATTERN_IDS.MF
  const strip = selectedShift
    ? buildRotationStrip(
        selectedShift.name,
        today,
        isMonFri ? (today.getDay() === 0 ? 6 : today.getDay() - 1) : 3,
        isMonFri ? 6 - (today.getDay() === 0 ? 6 : today.getDay() - 1) : 4
      )
    : []
  const transition = selectedShift ? nextTransition(selectedShift.name, today, !onToday) : null

  const byDept: Record<string, number> = {}
  roster.forEach((e) => {
    if (e.department_id) byDept[e.department_id] = (byDept[e.department_id] ?? 0) + 1
  })
  const tierCounts = { management: 0, indirect: 0, direct: 0 }
  roster.forEach((e) => {
    tierCounts[e.tier]++
  })

  const treeRoots = useMemo(() => buildOrgTree(roster, null), [roster])

  if (loadingEmployees || loadingShifts) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Shifts & Working Patterns"
        description="A live, shift-first view of who's working today, who's resting, and who leads each pattern — built from each employee's assigned shift."
      />

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        {statusByShift.map(({ shift, onToday: on, headcount }) => (
          <button
            key={shift.id}
            onClick={() => setSelectedShiftId(shift.id)}
            className={`card p-4 text-left ${effectiveShiftId === shift.id ? 'border-accent ring-1 ring-accent' : ''}`}
          >
            <p className="text-[13px] font-semibold m-0">{shift.name}</p>
            <p className="text-[11px] text-ink-faint mt-0.5 mb-2.5">{shift.pattern_description}</p>
            <div className="flex items-center justify-between">
              <Badge tone={on ? 'good' : 'default'}>{on ? 'On shift today' : 'Off today'}</Badge>
              <span className="text-xs text-ink-muted">{headcount} people</span>
            </div>
          </button>
        ))}
      </div>

      {selectedShift && (
        <>
          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <p className="text-[15px] font-bold m-0">{selectedShift.name}</p>
            <Badge tone={onToday ? 'good' : 'default'}>{onToday ? 'On shift today' : 'Resting today'}</Badge>
            {!isMonFri && transition && (
              <span className="text-xs text-ink-faint">
                {onToday ? 'Off from ' : 'Next on from '}
                {transition.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          <div className="card p-5 mb-5">
            <p className="text-xs font-medium text-ink-muted mb-3">{isMonFri ? 'This week' : 'Rotation — 8 day cycle'}</p>
            <div className="flex gap-2 flex-wrap">
              {strip.map((d, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center px-1.5 py-2.5 rounded-md border ${
                    d.isToday ? 'border-accent border-[1.5px]' : 'border-border'
                  } ${d.onShift ? 'bg-good-light' : 'bg-canvas'}`}
                  style={{ minWidth: 60 }}
                >
                  <p className="text-[10px] text-ink-faint uppercase m-0">{d.date.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                  <p className="text-[13px] font-semibold my-0.5">{d.date.getDate()}</p>
                  <p className={`text-[10px] font-semibold m-0 ${d.onShift ? 'text-good' : 'text-ink-faint'}`}>
                    {d.onShift ? 'ON' : 'OFF'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <StatCard label="Headcount on this pattern" value={String(roster.length)} />
            <StatCard label="Management" value={String(tierCounts.management)} />
            <StatCard label="Indirect" value={String(tierCounts.indirect)} />
            <StatCard label="Direct" value={String(tierCounts.direct)} />
            <StatCard label="Departments covered" value={String(Object.keys(byDept).length)} />
          </div>

          <div className="card p-8 overflow-x-auto">
            <p className="text-sm font-semibold mb-5">Who leads this shift</p>
            {treeRoots.length === 0 ? (
              <p className="text-sm text-ink-muted">No one is currently assigned to this shift pattern.</p>
            ) : (
              <div className={`flex gap-12 min-w-fit ${treeRoots.length > 1 ? 'justify-start' : 'justify-center'}`}>
                {treeRoots.map((root) => (
                  <OrgTreeNode key={root.employee.id} node={root} />
                ))}
              </div>
            )}
            <p className="text-[11px] text-ink-faint mt-4">
              Each tree starts from the most senior person actually present on this shift — either the top of the whole
              site structure, or someone whose own manager works a different pattern.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
