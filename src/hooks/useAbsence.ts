import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AbsenceRecord, EmployeeAbsenceSummary, ReturnToWorkForm } from '@/lib/types'

/** 12-month instance/days/disciplinary-stage summary per employee — computed
 * server-side by the employee_absence_summary view, not recomputed client-side. */
export function useAbsenceSummaries(companyId: string | null) {
  const [summaries, setSummaries] = useState<EmployeeAbsenceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId) {
      setSummaries([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('employee_absence_summary')
      .select('*')
      .eq('company_id', companyId)

    if (fetchError) setError(fetchError.message)
    setSummaries(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { summaries, loading, error, reload: load }
}

/** Full absence history for a single employee (for the detail modal). */
export function useAbsenceRecords(employeeId: string | null) {
  const [records, setRecords] = useState<AbsenceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!employeeId) {
      setRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('absence_records')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('start_date', new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10))
      .order('start_date', { ascending: false })
    setRecords(data ?? [])
    setLoading(false)
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  return { records, loading, reload: load }
}

export async function completeReturnToWork(absenceId: string, form: ReturnToWorkForm) {
  const { error } = await supabase
    .from('absence_records')
    .update({ return_to_work_completed: true, rtw: form })
    .eq('id', absenceId)
  if (error) throw error
}
