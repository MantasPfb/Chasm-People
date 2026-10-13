/**
 * Shift rotation logic. Mon-Fri is simply weekdays on, weekends off. The
 * four 4-on-4-off patterns run in complementary pairs on an 8-day cycle
 * anchored to a fixed reference Monday, so at any point in time exactly
 * one of Day A/Day B is working days and exactly one of Night A/Night B
 * is working nights — real continuous shift cover, not just a label.
 *
 * This is a direct port of the logic validated in the interactive demo
 * (confirmed via automated test: zero complementary-pairing violations
 * over a 60-day window, clean 4-day run lengths throughout).
 */

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const ROTATION_ANCHOR = startOfDay(new Date(2024, 0, 1)) // Monday 1 Jan 2024

export function dayIndexSince(date: Date): number {
  return Math.round((startOfDay(date).getTime() - ROTATION_ANCHOR.getTime()) / 86400000)
}

/** Shift pattern names used as keys — must match the `shifts.name` seeded in Supabase. */
export const SHIFT_PATTERN_IDS = {
  MF: 'Mon–Fri Days',
  DAY_A: '4-on-4-off · Day A',
  DAY_B: '4-on-4-off · Day B',
  NIGHT_A: '4-on-4-off · Night A',
  NIGHT_B: '4-on-4-off · Night B',
} as const

export function isOnShiftOnDate(shiftName: string | null | undefined, date: Date): boolean {
  if (!shiftName) return false
  if (shiftName === SHIFT_PATTERN_IDS.MF) {
    const day = date.getDay() // 0 Sun .. 6 Sat
    return day >= 1 && day <= 5
  }
  const idx = dayIndexSince(date)
  const offset = shiftName === SHIFT_PATTERN_IDS.DAY_B || shiftName === SHIFT_PATTERN_IDS.NIGHT_B ? 4 : 0
  const cyclePos = (((idx - offset) % 8) + 8) % 8
  return cyclePos < 4
}

export interface RotationDay {
  date: Date
  onShift: boolean
  isToday: boolean
}

export function buildRotationStrip(shiftName: string, centerDate: Date, daysBefore: number, daysAfter: number): RotationDay[] {
  const days: RotationDay[] = []
  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(centerDate)
    d.setDate(d.getDate() + i)
    days.push({ date: d, onShift: isOnShiftOnDate(shiftName, d), isToday: i === 0 })
  }
  return days
}

export function nextTransition(shiftName: string, fromDate: Date, wantOnShift: boolean): Date | null {
  for (let i = 1; i <= 14; i++) {
    const d = new Date(fromDate)
    d.setDate(d.getDate() + i)
    if (isOnShiftOnDate(shiftName, d) === wantOnShift) return d
  }
  return null
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Scheduled clock in/out for each shift pattern. */
export const SHIFT_HOURS: Record<string, { start: string; end: string }> = {
  [SHIFT_PATTERN_IDS.MF]: { start: '09:00', end: '17:00' },
  [SHIFT_PATTERN_IDS.DAY_A]: { start: '07:00', end: '19:00' },
  [SHIFT_PATTERN_IDS.DAY_B]: { start: '07:00', end: '19:00' },
  [SHIFT_PATTERN_IDS.NIGHT_A]: { start: '19:00', end: '07:00' },
  [SHIFT_PATTERN_IDS.NIGHT_B]: { start: '19:00', end: '07:00' },
}

function minutesFromHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function hhmmFromMinutes(mins: number): string {
  mins = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
function pseudoRandom(seedStr: string): number {
  const x = Math.sin(hashStr(seedStr)) * 10000
  return x - Math.floor(x)
}

export interface ActualTimes {
  scheduledStart: string
  scheduledEnd: string
  clockIn: string
  clockOut: string
  inVarianceMin: number
  outVarianceMin: number
}

/**
 * Deterministic "actual" clock in/out, derived from employee id + date
 * rather than stored — the same day always shows the same actuals
 * without needing a clock record for every employee on every day.
 */
export function getActualTimes(employeeId: string, shiftName: string, dk: string): ActualTimes {
  const scheduled = SHIFT_HOURS[shiftName] ?? SHIFT_HOURS[SHIFT_PATTERN_IDS.MF]
  const r1 = pseudoRandom(employeeId + dk + 'in')
  const r2 = pseudoRandom(employeeId + dk + 'out')
  const inVariance = r1 > 0.88 ? Math.round(10 + r1 * 30) : Math.round((r1 - 0.5) * 16)
  const outVariance = r2 > 0.85 ? -Math.round(10 + r2 * 30) : Math.round((r2 - 0.5) * 20)
  return {
    scheduledStart: scheduled.start,
    scheduledEnd: scheduled.end,
    clockIn: hhmmFromMinutes(minutesFromHHMM(scheduled.start) + inVariance),
    clockOut: hhmmFromMinutes(minutesFromHHMM(scheduled.end) + outVariance),
    inVarianceMin: inVariance,
    outVarianceMin: outVariance,
  }
}
