/** Holiday-year risk: behind pace this late in the year with meaningful
 * leave still unused. Holiday year runs 1 Jan – 31 Dec. */
export function holidayRiskStatus(entitlement: number, taken: number, today?: Date): 'on_track' | 'at_risk' {
  const now = today ?? new Date()
  const remaining = entitlement - taken
  if (remaining <= 0) return 'on_track'
  const endOfYear = new Date(now.getFullYear(), 11, 31)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const daysLeft = Math.max(0, Math.ceil((endOfYear.getTime() - now.getTime()) / 86400000))
  const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / 86400000) + 1
  const yearProgressPct = ((totalDays - daysLeft) / totalDays) * 100
  const pctTaken = (taken / entitlement) * 100
  if (daysLeft > 0 && (remaining / daysLeft) * 7 > 2.5) return 'at_risk'
  if (pctTaken < yearProgressPct - 25) return 'at_risk'
  return 'on_track'
}
