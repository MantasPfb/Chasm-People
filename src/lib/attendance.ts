import type { AttendanceStatus, AttendanceOverride, Employee, Shift } from './types'
import { isOnShiftOnDate } from './shiftRotation'

/**
 * Status for a given employee/date: an explicit override (holiday,
 * sickness, unauthorised, or an explicit working/rest override) takes
 * priority; otherwise it falls back to the shift rotation.
 */
export function dayStatusFor(
  employee: Pick<Employee, 'id' | 'shift_id'>,
  date: Date,
  shiftsById: Map<string, Shift>,
  overridesByKey: Map<string, AttendanceStatus>
): AttendanceStatus {
  const dk = date.toISOString().slice(0, 10)
  const key = employee.id + '|' + dk
  const override = overridesByKey.get(key)
  if (override) return override
  const shift = employee.shift_id ? shiftsById.get(employee.shift_id) : undefined
  return isOnShiftOnDate(shift?.name, date) ? 'working' : 'rest'
}

export function overridesToMap(overrides: AttendanceOverride[]): Map<string, AttendanceStatus> {
  const map = new Map<string, AttendanceStatus>()
  overrides.forEach((o) => map.set(o.employee_id + '|' + o.attendance_date, o.status))
  return map
}
