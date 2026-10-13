import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AttendanceOverride, AttendanceStatus } from '@/lib/types'

/** Attendance overrides within a date range (inclusive), as a sparse set — a day
 * with no row here falls back to the employee's shift rotation. */
export function useAttendanceOverrides(companyId: string | null, startDateKey: string | null, endDateKey: string | null) {
  const [overrides, setOverrides] = useState<AttendanceOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId || !startDateKey || !endDateKey) {
      setOverrides([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('attendance_overrides')
      .select('*')
      .eq('company_id', companyId)
      .gte('attendance_date', startDateKey)
      .lte('attendance_date', endDateKey)

    if (fetchError) setError(fetchError.message)
    setOverrides(data ?? [])
    setLoading(false)
  }, [companyId, startDateKey, endDateKey])

  useEffect(() => {
    load()
  }, [load])

  return { overrides, loading, error, reload: load }
}

/** Apply one status to a batch of (employeeId, dateKey) pairs in one upsert. */
export async function applyAttendanceStatus(params: {
  companyId: string
  entries: { employeeId: string; dateKey: string }[]
  status: AttendanceStatus
}) {
  if (params.entries.length === 0) return
  const rows = params.entries.map((e) => ({
    company_id: params.companyId,
    employee_id: e.employeeId,
    attendance_date: e.dateKey,
    status: params.status,
  }))
  const { error } = await supabase.from('attendance_overrides').upsert(rows, { onConflict: 'employee_id,attendance_date' })
  if (error) throw error
}
