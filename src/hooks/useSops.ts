import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Sop } from '@/lib/types'

export interface SopWithCapabilities extends Sop {
  capability_ids: string[]
}

/** SOPs for the company, each with its linked capability ids (empty for a process SOP). */
export function useSops(companyId: string | null) {
  const [sops, setSops] = useState<SopWithCapabilities[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyId) {
      setSops([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data: sopRows, error: sopError } = await supabase
      .from('sops')
      .select('*')
      .eq('company_id', companyId)
      .order('code')

    if (sopError) {
      setError(sopError.message)
      setLoading(false)
      return
    }

    const sopIds = (sopRows ?? []).map((s) => s.id)
    const capsBySop = new Map<string, string[]>()
    if (sopIds.length > 0) {
      const { data: linkRows, error: linkError } = await supabase
        .from('sop_capabilities')
        .select('sop_id, capability_id')
        .in('sop_id', sopIds)
      if (linkError) {
        setError(linkError.message)
        setLoading(false)
        return
      }
      ;(linkRows ?? []).forEach((row) => {
        const list = capsBySop.get(row.sop_id) ?? []
        list.push(row.capability_id)
        capsBySop.set(row.sop_id, list)
      })
    }

    setSops((sopRows ?? []).map((s) => ({ ...s, capability_ids: capsBySop.get(s.id) ?? [] })))
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  return { sops, loading, error, reload: load }
}

export function getSopForCapability(capabilityId: string, sops: SopWithCapabilities[]): SopWithCapabilities | null {
  return sops.find((s) => s.capability_ids.includes(capabilityId)) ?? null
}

export async function createSop(params: {
  companyId: string
  departmentId: string
  code: string
  title: string
  owner: string
  summary: string
  steps: string[]
  capabilityId?: string | null
}) {
  const reviewDue = new Date()
  reviewDue.setMonth(reviewDue.getMonth() + 12)

  const { data, error } = await supabase
    .from('sops')
    .insert({
      company_id: params.companyId,
      department_id: params.departmentId,
      code: params.code,
      title: params.title,
      version: 'v1.0',
      owner: params.owner,
      summary: params.summary,
      steps: params.steps,
      last_reviewed: new Date().toISOString().slice(0, 10),
      review_due: reviewDue.toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error

  if (params.capabilityId) {
    const { error: linkError } = await supabase
      .from('sop_capabilities')
      .insert({ sop_id: data.id, capability_id: params.capabilityId })
    if (linkError) throw linkError
  }
  return data as Sop
}

export async function updateSop(sop: Sop) {
  const { error } = await supabase
    .from('sops')
    .update({
      title: sop.title,
      version: sop.version,
      owner: sop.owner,
      summary: sop.summary,
      steps: sop.steps,
      review_due: sop.review_due,
      last_reviewed: new Date().toISOString().slice(0, 10),
    })
    .eq('id', sop.id)
  if (error) throw error
}
