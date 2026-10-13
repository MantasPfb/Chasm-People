import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments, useEmployees } from '@/hooks/useEmployees'
import { applyAttendanceStatus, useAttendanceOverrides } from '@/hooks/useAttendance'
import { Avatar, Badge, ErrorState, LoadingState, PageHeader } from '@/components/ui/Primitives'
import { DayDetailModal } from '@/components/people/DayDetailModal'
import { addDays, dateKey, isOnShiftOnDate, startOfDay } from '@/lib/shiftRotation'
import { ATTENDANCE_STATUS_META, type AttendanceStatus } from '@/lib/types'

type RangeMode = '7d' | '1m' | '12m' | 'custom'

function attendanceKey(employeeId: string, dk: string) {
  return employeeId + '|' + dk
}

export default function TimeAttendance() {
  const { activeCompanyId } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)

  const [rangeMode, setRangeMode] = useState<RangeMode>('7d')
  const [customStart, setCustomStart] = useState(dateKey(new Date()))
  const [customEnd, setCustomEnd] = useState(dateKey(addDays(new Date(), 13)))
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [dayDetail, setDayDetail] = useState<{ employeeId: string; dk: string } | null>(null)

  const dateRange = useMemo(() => {
    const today = startOfDay(new Date())
    if (rangeMode === '7d') return Array.from({ length: 7 }, (_, i) => addDays(today, i))
    if (rangeMode === '1m') return Array.from({ length: 30 }, (_, i) => addDays(today, i))
    if (rangeMode === '12m') return Array.from({ length: 365 }, (_, i) => addDays(today, i))
    const start = startOfDay(new Date(customStart + 'T00:00:00'))
    const end = startOfDay(new Date(customEnd + 'T00:00:00'))
    const span = Math.round((end.getTime() - start.getTime()) / 86400000)
    if (span < 0) return []
    return Array.from({ length: Math.min(span + 1, 400) }, (_, i) => addDays(start, i))
  }, [rangeMode, customStart, customEnd])

  const rangeStart = dateRange[0] ? dateKey(dateRange[0]) : null
  const rangeEnd = dateRange[dateRange.length - 1] ? dateKey(dateRange[dateRange.length - 1]) : null
  const { overrides, loading: loadingOverrides, error, reload } = useAttendanceOverrides(activeCompanyId, rangeStart, rangeEnd)

  const overridesByKey = useMemo(() => {
    const map = new Map<string, AttendanceStatus>()
    overrides.forEach((o) => map.set(attendanceKey(o.employee_id, o.attendance_date), o.status))
    return map
  }, [overrides])

  const filteredEmployees = useMemo(
    () =>
      employees.filter((e) => {
        if (e.employment_status === 'left') return false
        if (deptFilter && e.department_id !== deptFilter) return false
        if (
          search &&
          !(e.first_name + ' ' + e.last_name).toLowerCase().includes(search.toLowerCase()) &&
          !(e.clock_number ?? '').includes(search)
        )
          return false
        return true
      }),
    [employees, deptFilter, search]
  )

  function statusFor(employeeId: string, shiftName: string | null | undefined, dk: string): AttendanceStatus {
    const key = attendanceKey(employeeId, dk)
    const override = overridesByKey.get(key)
    if (override) return override
    return isOnShiftOnDate(shiftName, new Date(dk + 'T00:00:00')) ? 'working' : 'rest'
  }

  function toggleKey(k: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }
  function toggleRow(empId: string) {
    const keys = dateRange.map((d) => attendanceKey(empId, dateKey(d)))
    setSelectedKeys((prev) => {
      const allOn = keys.every((k) => prev.has(k))
      const next = new Set(prev)
      keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)))
      return next
    })
  }
  function toggleColumn(dk: string) {
    const keys = filteredEmployees.map((e) => attendanceKey(e.id, dk))
    setSelectedKeys((prev) => {
      const allOn = keys.every((k) => prev.has(k))
      const next = new Set(prev)
      keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)))
      return next
    })
  }
  function handleCellClick(empId: string, dk: string) {
    if (selectMode) toggleKey(attendanceKey(empId, dk))
    else setDayDetail({ employeeId: empId, dk })
  }
  async function applyStatus(status: AttendanceStatus) {
    if (!activeCompanyId) return
    const entries = Array.from(selectedKeys).map((k) => {
      const [employeeId, dk] = k.split('|')
      return { employeeId, dateKey: dk }
    })
    await applyAttendanceStatus({ companyId: activeCompanyId, entries, status })
    setSelectedKeys(new Set())
    reload()
  }

  const dayDetailEmployee = dayDetail ? employees.find((e) => e.id === dayDetail.employeeId) : null

  if (loadingEmployees) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Time & Attendance"
        description="A roster view of who's scheduled to work each day. Toggle select mode to highlight a person, a date, or a range and apply a status in bulk — or click any day to see required vs. actual clock times."
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="flex flex-wrap gap-2.5 items-center mb-3">
        <div className="inline-flex border border-border rounded overflow-hidden">
          {([
            ['7d', 'Next 7 days'],
            ['1m', 'Next 1 month'],
            ['12m', 'Next 12 months'],
            ['custom', 'Custom'],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setRangeMode(v)}
              className={`px-3 py-1.5 text-sm font-medium ${rangeMode === v ? 'bg-accent text-white' : 'bg-surface text-ink-muted hover:bg-canvas'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {rangeMode === 'custom' && (
          <>
            <input type="date" className="input max-w-[160px]" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span className="text-sm text-ink-faint">to</span>
            <input type="date" className="input max-w-[160px]" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5 items-center mb-4">
        <input
          className="input max-w-[200px]"
          placeholder="Search name or clock no.…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[200px]" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          className={selectMode ? 'btn-primary' : 'btn-secondary'}
          onClick={() => {
            setSelectMode((v) => !v)
            setSelectedKeys(new Set())
          }}
        >
          {selectMode ? 'Done selecting' : 'Select cells to apply status'}
        </button>
        {selectMode && (
          <span className="text-xs text-ink-faint">
            {selectedKeys.size} selected — click a name to select their row, a date to select that column
          </span>
        )}
      </div>

      {selectMode && selectedKeys.size > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3.5 py-2.5 bg-accent-light rounded-md flex-wrap">
          <span className="text-sm text-accent-dark font-medium">Apply to {selectedKeys.size} selected:</span>
          {Object.entries(ATTENDANCE_STATUS_META).map(([v, m]) => (
            <button key={v} className="btn-secondary !text-xs !py-1 !px-2.5" onClick={() => applyStatus(v as AttendanceStatus)}>
              {m.label}
            </button>
          ))}
          <button className="text-xs text-ink-muted hover:text-ink" onClick={() => setSelectedKeys(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <div className="flex gap-3.5 mb-3 text-xs text-ink-muted flex-wrap">
        {Object.entries(ATTENDANCE_STATUS_META).map(([v, m]) => (
          <Badge key={v} tone={m.tone}>
            {m.label}
          </Badge>
        ))}
      </div>

      {rangeMode === '12m' && (
        <p className="text-xs text-ink-faint mb-2.5">
          Showing 365 days across {filteredEmployees.length} people — this view may take a moment to render and scrolls
          horizontally.
        </p>
      )}

      {loadingOverrides ? (
        <LoadingState />
      ) : (
        <div className="card overflow-auto max-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-10 bg-surface px-4 py-2 text-left font-medium text-xs text-ink-faint border-b border-r border-border min-w-[190px]">
                  Employee
                </th>
                {dateRange.map((d) => {
                  const dk = dateKey(d)
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <th
                      key={dk}
                      onClick={() => selectMode && toggleColumn(dk)}
                      className={`sticky top-0 px-1 py-1.5 text-center font-medium text-[10px] text-ink-faint border-b border-border min-w-[46px] ${
                        isWeekend ? 'bg-canvas' : 'bg-surface'
                      } ${selectMode ? 'cursor-pointer' : ''}`}
                    >
                      <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                      <div className="text-[11px] font-semibold text-ink-muted">
                        {d.getDate()}/{d.getMonth() + 1}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td
                    onClick={() => selectMode && toggleRow(emp.id)}
                    className={`sticky left-0 bg-surface px-4 py-1.5 border-b border-r border-border ${selectMode ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar firstName={emp.first_name} lastName={emp.last_name} color={emp.avatar_color} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium whitespace-nowrap m-0">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-[11px] text-ink-faint m-0">Clock {emp.clock_number}</p>
                      </div>
                    </div>
                  </td>
                  {dateRange.map((d) => {
                    const dk = dateKey(d)
                    const status = statusFor(emp.id, emp.shift?.name, dk)
                    const meta = ATTENDANCE_STATUS_META[status]
                    const key = attendanceKey(emp.id, dk)
                    const isSelected = selectedKeys.has(key)
                    const bgClass =
                      {
                        working: 'bg-good-light text-good',
                        rest: 'bg-canvas text-ink-faint',
                        holiday: 'bg-brightblue-light text-brightblue',
                        sickness: 'bg-critical-light text-critical',
                        unauthorised: 'bg-amber-light text-amber',
                      }[status]
                    return (
                      <td
                        key={dk}
                        onClick={() => handleCellClick(emp.id, dk)}
                        className={`border-b border-border p-0.5 text-center cursor-pointer ${isSelected ? 'ring-2 ring-accent ring-inset' : ''}`}
                        title={meta.label}
                      >
                        <div className={`rounded px-0.5 py-1 text-[9px] font-bold ${bgClass}`}>
                          {status === 'working'
                            ? (emp.shift?.name ?? 'W')
                                .replace('4-on-4-off · ', '')
                                .replace('Mon–Fri Days', 'M-F')
                            : meta.label.slice(0, 4)}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={dateRange.length + 1} className="p-6 text-center text-sm text-ink-muted">
                    No employees match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dayDetail && dayDetailEmployee && (
        <DayDetailModal
          employee={dayDetailEmployee}
          dateKey={dayDetail.dk}
          currentStatus={statusFor(dayDetail.employeeId, dayDetailEmployee.shift?.name, dayDetail.dk)}
          onClose={() => setDayDetail(null)}
          onSave={async (status) => {
            if (!activeCompanyId) return
            await applyAttendanceStatus({
              companyId: activeCompanyId,
              entries: [{ employeeId: dayDetail.employeeId, dateKey: dayDetail.dk }],
              status,
            })
            setDayDetail(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
