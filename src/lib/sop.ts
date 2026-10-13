export interface SopReviewStatus {
  label: string
  tone: 'good' | 'amber' | 'critical'
}

export function sopReviewStatus(reviewDue: string | null): SopReviewStatus {
  if (!reviewDue) return { label: 'No review date set', tone: 'amber' }
  const due = new Date(reviewDue + 'T00:00:00')
  const daysLeft = Math.round((due.getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return { label: 'Overdue for review', tone: 'critical' }
  if (daysLeft < 60) return { label: 'Review due soon', tone: 'amber' }
  return { label: 'Current', tone: 'good' }
}
