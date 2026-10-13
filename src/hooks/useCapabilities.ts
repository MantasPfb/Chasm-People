import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Assessment, Capability, EmployeeCapabilityStatus, RoleCapability } from '@/lib/types'

export function useCapabilities(companyId: string | null) {
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) {
      setCapabilities([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('capabilities')
      .select('*')
      .eq('company_id', companyId)
      .order('category')
      .order('name')
    setCapabilities(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { capabilities, loading, reload: load }
}

export function useRoleCapabilities(roleId: string | null) {
  const [roleCapabilities, setRoleCapabilities] = useState<RoleCapability[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!roleId) {
      setRoleCapabilities([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('role_capabilities')
      .select('*')
      .eq('role_id', roleId)
    setRoleCapabilities(data ?? [])
    setLoading(false)
  }, [roleId])

  useEffect(() => {
    load()
  }, [load])

  return { roleCapabilities, loading, reload: load }
}

/** Required-vs-current status for every employee in the company (skills matrix source). */
export function useSkillsMatrix(companyId: string | null) {
  const [rows, setRows] = useState<EmployeeCapabilityStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('employee_capability_status')
      .select('*')
      .eq('company_id', companyId)

    if (fetchError) setError(fetchError.message)
    setRows((data ?? []) as EmployeeCapabilityStatus[])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { rows, loading, error, reload: load }
}

/** Status rows + assessment history for a single employee's capability profile. */
export function useEmployeeCapabilityProfile(employeeId: string | null) {
  const [statuses, setStatuses] = useState<EmployeeCapabilityStatus[]>([])
  const [history, setHistory] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!employeeId) {
      setStatuses([])
      setHistory([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: statusRows }, { data: historyRows }] = await Promise.all([
      supabase.from('employee_capability_status').select('*').eq('employee_id', employeeId),
      supabase
        .from('assessments')
        .select('*')
        .eq('employee_id', employeeId)
        .order('assessed_at', { ascending: false }),
    ])
    setStatuses((statusRows ?? []) as EmployeeCapabilityStatus[])
    setHistory(historyRows ?? [])
    setLoading(false)
  }, [employeeId])

  useEffect(() => {
    load()
  }, [load])

  return { statuses, history, loading, reload: load }
}

export async function recordAssessment(params: {
  companyId: string
  employeeId: string
  capabilityId: string
  assessorId: string | null
  levelAchieved: number
  notes?: string
  source?: 'manager' | 'learning_hub'
}) {
  const { error } = await supabase.from('assessments').insert({
    company_id: params.companyId,
    employee_id: params.employeeId,
    capability_id: params.capabilityId,
    assessor_id: params.assessorId,
    level_achieved: params.levelAchieved,
    notes: params.notes ?? null,
    source: params.source ?? 'manager',
  })
  if (error) throw error
}
