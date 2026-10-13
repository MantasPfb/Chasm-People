import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

interface InvitationPreview {
  email: string
  role: string
  company_name: string
  is_expired: boolean
  is_accepted: boolean
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoadError('This invitation link is missing a token.')
      return
    }
    supabase
      .rpc('get_invitation', { p_token: token })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message)
        } else if (!data || data.length === 0) {
          setLoadError('This invitation could not be found.')
        } else {
          setInvitation(data[0] as InvitationPreview)
        }
      })
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!invitation || !token) return
    setSubmitting(true)
    setSubmitError(null)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (signUpError) {
      setSubmitError(signUpError.message)
      setSubmitting(false)
      return
    }

    // If email confirmation is required, there's no session yet — the user
    // must confirm their email, log in, then this invite link will finish
    // the join automatically because the profile/membership don't exist yet.
    if (!signUpData.session) {
      setSubmitError(
        'Account created. Please check your email to confirm your address, then sign in and reopen this invitation link.'
      )
      setSubmitting(false)
      return
    }

    await supabase.from('profiles').upsert({ id: signUpData.user!.id, full_name: fullName, email: invitation.email })

    const { error: acceptError } = await supabase.rpc('accept_invitation', { p_token: token })
    if (acceptError) {
      setSubmitError(acceptError.message)
      setSubmitting(false)
      return
    }

    navigate('/dashboard')
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-sm text-critical">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-muted">Loading invitation…</div>
  }

  if (invitation.is_accepted) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-sm text-ink">This invitation has already been used. Please sign in instead.</p>
        </div>
      </div>
    )
  }

  if (invitation.is_expired) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-sm text-critical">This invitation has expired. Ask your administrator to send a new one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-lg font-semibold text-ink">Join {invitation.company_name}</p>
          <p className="text-sm text-ink-muted mt-1">
            Set up your account for <span className="font-medium">{invitation.email}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="fullName">
              Full name
            </label>
            <input id="fullName" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Create a password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {submitError && <p className="text-sm text-critical">{submitError}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Setting up…' : 'Create account & join'}
          </button>
        </form>
      </div>
    </div>
  )
}
