import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Company, CompanyMembership, Profile } from '@/lib/types'

interface MembershipWithCompany extends CompanyMembership {
  company: Company
}

interface AuthContextValue {
  loading: boolean
  session: Session | null
  profile: Profile | null
  isPlatformAdmin: boolean
  memberships: MembershipWithCompany[]
  activeCompanyId: string | null
  activeMembership: MembershipWithCompany | null
  setActiveCompanyId: (companyId: string) => void
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const ACTIVE_COMPANY_KEY = 'chasm.activeCompanyId'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [memberships, setMemberships] = useState<MembershipWithCompany[]>([])
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_COMPANY_KEY)
  )

  async function loadUserContext(userId: string) {
    const [{ data: profileData }, { data: adminRow }, { data: membershipRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
      supabase
        .from('company_memberships')
        .select('*, company:companies(*)')
        .eq('user_id', userId),
    ])

    setProfile(profileData ?? null)
    setIsPlatformAdmin(Boolean(adminRow))
    const loadedMemberships = (membershipRows ?? []) as unknown as MembershipWithCompany[]
    setMemberships(loadedMemberships)

    // Keep the active company valid: if nothing selected yet, or the
    // previous selection is no longer accessible, default to the first one.
    setActiveCompanyIdState((current) => {
      const stillValid = current && loadedMemberships.some((m) => m.company_id === current)
      if (stillValid) return current
      const fallback = loadedMemberships[0]?.company_id ?? null
      if (fallback) localStorage.setItem(ACTIVE_COMPANY_KEY, fallback)
      return fallback
    })
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    if (data.session?.user) {
      await loadUserContext(data.session.user.id)
    } else {
      setProfile(null)
      setMemberships([])
      setIsPlatformAdmin(false)
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        await loadUserContext(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        await loadUserContext(newSession.user.id)
      } else {
        setProfile(null)
        setMemberships([])
        setIsPlatformAdmin(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  function setActiveCompanyId(companyId: string) {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId)
    setActiveCompanyIdState(companyId)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const activeMembership = useMemo(
    () => memberships.find((m) => m.company_id === activeCompanyId) ?? null,
    [memberships, activeCompanyId]
  )

  const value: AuthContextValue = {
    loading,
    session,
    profile,
    isPlatformAdmin,
    memberships,
    activeCompanyId,
    activeMembership,
    setActiveCompanyId,
    signOut,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
