import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Badge, LoadingState } from '@/components/ui/Primitives'
import type { Company } from '@/lib/types'

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function PlatformAdmin() {
  const { isPlatformAdmin, refresh } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  async function loadCompanies() {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    setCompanies(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (isPlatformAdmin) loadCompanies()
  }, [isPlatformAdmin])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setInviteLink(null)

    const { data: company, error: createError } = await supabase
      .from('companies')
      .insert({ name, slug: slugify(name), industry: industry || null })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setCreating(false)
      return
    }

    // Create the primary site so the company has somewhere to attach
    // departments/employees to (the beta shows one site per company).
    await supabase.from('sites').insert({ company_id: company.id, name: `${name} — Main Site`, is_primary: true })

    if (adminEmail) {
      const { data: invitation } = await supabase
        .from('company_invitations')
        .insert({ company_id: company.id, email: adminEmail, role: 'company_admin' })
        .select('token')
        .single()
      if (invitation) {
        setInviteLink(`${window.location.origin}/accept-invite?token=${invitation.token}`)
      }
    }

    setName('')
    setIndustry('')
    setAdminEmail('')
    setCreating(false)
    loadCompanies()
    refresh()
  }

  if (!isPlatformAdmin) {
    return <p className="text-sm text-ink-muted">Platform administration is only available to platform administrators.</p>
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader title="Platform Administration" description="Create companies and invite their first administrator." />

      <div className="card p-5 mb-6">
        <p className="text-sm font-medium text-ink mb-3">New company</p>
        <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
          <div>
            <label className="label">Company name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Industry (optional)</label>
            <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div>
            <label className="label">First company admin's email (optional — can invite later)</label>
            <input type="email" className="input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Creating…' : 'Create company'}
          </button>
        </form>
        {inviteLink && (
          <div className="mt-4 text-sm bg-canvas rounded px-3 py-2 border border-border">
            <p className="text-ink-muted mb-1">Share this invitation link with the company admin:</p>
            <code className="text-xs break-all text-ink">{inviteLink}</code>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium text-ink">All companies</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 text-ink">{c.name}</td>
                <td className="px-5 py-2.5 text-ink-muted">{c.industry ?? '—'}</td>
                <td className="px-5 py-2.5">{c.is_demo && <Badge tone="amber">Demo</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
