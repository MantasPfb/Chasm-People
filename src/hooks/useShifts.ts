import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { ManningRequirement, Shift } from '@/lib/types'

export function useShifts(companyId: string | null) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) {
      setShifts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('shifts').select('*').eq('company_id', companyId).order('name')
    setShifts(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { shifts, loading, reload: load }
}

export function useManningRequirements(companyId: string | null) {
  const [manningRequirements, setManningRequirements] = useState<ManningRequirement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) {
      setManningRequirements([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('manning_requirements').select('*').eq('company_id', companyId)
    setManningRequirements(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { manningRequirements, loading, reload: load }
}
