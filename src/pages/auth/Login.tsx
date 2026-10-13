import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Already signed in (e.g. navigated back to /login manually) — don't show the form.
  if (!authLoading && session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-lg font-semibold tracking-tight text-ink">CHASM People</p>
          <p className="text-sm text-ink-muted mt-1">People management &amp; capability platform</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-ink-faint text-center mt-6">
          Access is by invitation. Contact your company administrator or platform administrator for an account.
        </p>
      </div>
    </div>
  )
}
