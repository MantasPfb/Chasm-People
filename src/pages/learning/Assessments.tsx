import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEmployees } from '@/hooks/useEmployees'
import { recordAssessment, useRoleCapabilities } from '@/hooks/useCapabilities'
import { useSops, getSopForCapability, type SopWithCapabilities } from '@/hooks/useSops'
import { useDepartments } from '@/hooks/useEmployees'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Avatar, CompetenceDot, LoadingState } from '@/components/ui/Primitives'
import { SopDetailModal } from '@/components/learning/SopDetailModal'
import { COMPETENCE_LEVELS, type Assessment, type Capability } from '@/lib/types'

interface RecentAssessment extends Assessment {
  employee: { first_name: string; last_name: string } | null
  capability: { name: string } | null
}

export default function Assessments() {
  const { activeCompanyId, activeMembership } = useAuth()
  const { employees, loading: loadingEmployees } = useEmployees(activeCompanyId)

  const canAssess = activeMembership?.role === 'company_admin' || activeMembership?.role === 'manager'

  const [employeeId, setEmployeeId] = useState('')
  const [capabilityId, setCapabilityId] = useState('')
  const [level, setLevel] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const selectedEmployee = employees.find((e) => e.id === employeeId)
  const { roleCapabilities } = useRoleCapabilities(selectedEmployee?.role_id ?? null)
  const [capabilityNames, setCapabilityNames] = useState<Record<string, Capability>>({})
  const { sops } = useSops(activeCompanyId)
  const { departments } = useDepartments(activeCompanyId)
  const [viewingSop, setViewingSop] = useState<SopWithCapabilities | null>(null)
  const linkedSop = capabilityId ? getSopForCapability(capabilityId, sops) : null

  useEffect(() => {
    if (roleCapabilities.length === 0) return
    supabase
      .from('capabilities')
      .select('*')
      .in(
        'id',
        roleCapabilities.map((rc) => rc.capability_id)
      )
      .then(({ data }) => {
        const map: Record<string, Capability> = {}
        for (const c of data ?? []) map[c.id] = c
        setCapabilityNames(map)
      })
  }, [roleCapabilities])

  const [recent, setRecent] = useState<RecentAssessment[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  async function loadRecent() {
    if (!activeCompanyId) return
    setLoadingRecent(true)
    const { data } = await supabase
      .from('assessments')
      .select('*, employee:employee_id(first_name, last_name), capability:capability_id(name)')
      .eq('company_id', activeCompanyId)
      .order('assessed_at', { ascending: false })
      .limit(20)
    setRecent((data as unknown as RecentAssessment[]) ?? [])
    setLoadingRecent(false)
  }

  useEffect(() => {
    loadRecent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activeCompanyId || !employeeId || !capabilityId) return
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await recordAssessment({
        companyId: activeCompanyId,
        employeeId,
        capabilityId,
        assessorId: null,
        levelAchieved: level,
        notes: notes || undefined,
      })
      setSuccessMessage('Assessment recorded. The employee profile and skills matrix now reflect this result.')
      setCapabilityId('')
      setNotes('')
      setLevel(3)
      loadRecent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this assessment.')
    } finally {
      setSaving(false)
    }
  }

  const requiredCapabilities = useMemo(
    () => roleCapabilities.map((rc) => ({ ...rc, capability: capabilityNames[rc.capability_id] })).filter((rc) => rc.capability),
    [roleCapabilities, capabilityNames]
  )

  if (loadingEmployees) return <LoadingState />

  if (!canAssess) {
    return (
      <div>
        <PageHeader title="Assessments" description="Record competence assessments against role requirements." />
        <p className="text-sm text-ink-muted">Only managers and company administrators can record assessments.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Assessments"
        description="Select an employee and capability, record the competence level achieved, and save. Every assessment is kept as evidence history — nothing is overwritten."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div>
            <label className="label">Employee</label>
            <select className="input" required value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setCapabilityId('') }}>
              <option value="">Select an employee…</option>
              {employees
                .filter((e) => e.employment_status === 'active')
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} — {e.role?.title ?? 'No role'}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="label">Capability</label>
            <select className="input" required value={capabilityId} onChange={(e) => setCapabilityId(e.target.value)} disabled={!employeeId}>
              <option value="">{employeeId ? 'Select a capability…' : 'Choose an employee first'}</option>
              {requiredCapabilities.map((rc) => (
                <option key={rc.capability_id} value={rc.capability_id}>
                  {rc.capability!.name} (required level {rc.required_level})
                </option>
              ))}
            </select>
            {employeeId && requiredCapabilities.length === 0 && (
              <p className="text-xs text-ink-faint mt-1">This employee's role has no capability requirements defined yet.</p>
            )}
            {linkedSop && (
              <div className="flex items-center justify-between mt-2 px-2.5 py-2 bg-accent-light rounded">
                <span className="text-xs text-accent-dark">
                  Assess against {linkedSop.code}: {linkedSop.title}
                </span>
                <button
                  type="button"
                  className="text-xs text-accent-dark hover:underline flex-shrink-0 ml-2"
                  onClick={() => setViewingSop(linkedSop)}
                >
                  View SOP
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="label">Level achieved</label>
            <select className="input" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {COMPETENCE_LEVELS.map((l) => (
                <option key={l.level} value={l.level}>
                  {l.level} — {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}
          {successMessage && <p className="text-sm text-good">{successMessage}</p>}

          <button type="submit" disabled={saving || !employeeId || !capabilityId} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Record assessment'}
          </button>
        </form>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-medium text-ink">Recent assessments</p>
          </div>
          {loadingRecent ? (
            <LoadingState />
          ) : recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">No assessments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {recent.map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <Avatar firstName={a.employee?.first_name ?? '?'} lastName={a.employee?.last_name ?? '?'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">
                      {a.employee?.first_name} {a.employee?.last_name} — {a.capability?.name}
                    </p>
                    <p className="text-xs text-ink-faint">{new Date(a.assessed_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <CompetenceDot level={a.level_achieved} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {viewingSop && (
        <SopDetailModal
          sop={viewingSop}
          departments={departments}
          capabilities={Object.values(capabilityNames)}
          onClose={() => setViewingSop(null)}
          onSaved={() => setViewingSop(null)}
        />
      )}
    </div>
  )
}
