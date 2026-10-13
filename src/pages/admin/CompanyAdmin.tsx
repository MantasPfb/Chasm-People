import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { PageHeader, Badge, LoadingState } from '@/components/ui/Primitives'
import type { MembershipRole } from '@/lib/types'

interface MemberRow {
  id: string
  user_id: string
  role: MembershipRole
  profile: { full_name: string; email: string } | null
}

interface InvitationRow {
  id: string
  email: string
  role: MembershipRole
  token: string
  accepted_at: string | null
  expires_at: string
}

export default function CompanyAdmin() {
  const { activeCompanyId, activeMembership, isPlatformAdmin } = useAuth()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MembershipRole>('employee')
  const [sending, setSending] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canManage = activeMembership?.role === 'company_admin' || isPlatformAdmin

  async function loadData() {
    if (!activeCompanyId) return
    setLoading(true)
    const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
      supabase.from('company_memberships').select('id, user_id, role, profile:user_id(full_name, email)').eq('company_id', activeCompanyId),
      supabase.from('company_invitations').select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false }),
    ])
    setMembers((memberRows as unknown as MemberRow[]) ?? [])
    setInvitations(inviteRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId])

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    if (!activeCompanyId) return
    setSending(true)
    setError(null)
    setLastInviteLink(null)
    const { data, error: inviteError } = await supabase
      .from('company_invitations')
      .insert({ company_id: activeCompanyId, email: inviteEmail, role: inviteRole })
      .select('token')
      .single()
    setSending(false)
    if (inviteError) {
      setError(inviteError.message)
      return
    }
    const link = `${window.location.origin}/accept-invite?token=${data.token}`
    setLastInviteLink(link)
    setInviteEmail('')
    loadData()
  }

  if (!activeCompanyId) return <LoadingState />
  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader title="Company Administration" description="Manage who has access to this company's workspace." />

      {!canManage ? (
        <p className="text-sm text-ink-muted">Only company administrators can manage members and invitations.</p>
      ) : (
        <>
          <div className="card p-5 mb-6">
            <p className="text-sm font-medium text-ink mb-3">Invite someone</p>
            <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="label">Email</label>
                <input type="email" required className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as MembershipRole)}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="company_admin">Company admin</option>
                </select>
              </div>
              <button type="submit" disabled={sending} className="btn-primary">
                {sending ? 'Sending…' : 'Create invitation'}
              </button>
            </form>
            {error && <p className="text-sm text-critical mt-3">{error}</p>}
            {lastInviteLink && (
              <div className="mt-3 text-sm bg-canvas rounded px-3 py-2 border border-border">
                <p className="text-ink-muted mb-1">
                  Invitation created. Share this link with the invitee (no email delivery is wired up in the beta):
                </p>
                <code className="text-xs break-all text-ink">{lastInviteLink}</code>
              </div>
            )}
          </div>

          <div className="card overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-sm font-medium text-ink">Pending invitations</p>
            </div>
            {invitations.filter((i) => !i.accepted_at).length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-muted">No pending invitations.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {invitations
                    .filter((i) => !i.accepted_at)
                    .map((i) => (
                      <tr key={i.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-2.5 text-ink">{i.email}</td>
                        <td className="px-5 py-2.5">
                          <Badge>{i.role.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-5 py-2.5 text-ink-faint text-xs">
                          Expires {new Date(i.expires_at).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium text-ink">Members</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 text-ink">{m.profile?.full_name ?? '—'}</td>
                <td className="px-5 py-2.5 text-ink-muted">{m.profile?.email ?? '—'}</td>
                <td className="px-5 py-2.5">
                  <Badge>{m.role.replace('_', ' ')}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
