import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Department, Employee, Role, Shift } from '@/lib/types'

export interface EmployeeWithRefs extends Employee {
  department: Department | null
  role: Role | null
  manager: Pick<Employee, 'id' | 'first_name' | 'last_name'> | null
  shift: Shift | null
}

export function useEmployees(companyId: string | null) {
  const [employees, setEmployees] = useState<EmployeeWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId) {
      setEmployees([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('employees')
      .select(
        `*, department:departments(*), role:roles(*), manager:manager_id(id, first_name, last_name), shift:shift_id(*)`
      )
      .eq('company_id', companyId)
      .order('last_name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEmployees((data ?? []) as unknown as EmployeeWithRefs[])
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { employees, loading, error, reload: load }
}

export function useDepartments(companyId: string | null) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) {
      setDepartments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    setDepartments(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { departments, loading, reload: load }
}

export function useRoles(companyId: string | null) {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) {
      setRoles([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('roles')
      .select('*')
      .eq('company_id', companyId)
      .order('title')
    setRoles(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { roles, loading, reload: load }
}
