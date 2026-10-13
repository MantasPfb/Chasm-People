import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/layouts/AppLayout'
import Login from '@/pages/auth/Login'
import AcceptInvite from '@/pages/auth/AcceptInvite'
import Dashboard from '@/pages/dashboard/Dashboard'

import PeopleOverview from '@/pages/people/PeopleOverview'
import EmployeeDirectory from '@/pages/people/EmployeeDirectory'
import EmployeeProfile from '@/pages/people/EmployeeProfile'
import OrganisationStructure from '@/pages/people/OrganisationStructure'
import RolesPage from '@/pages/people/RolesPage'
import ShiftsDashboard from '@/pages/people/ShiftsDashboard'
import TimeAttendance from '@/pages/people/TimeAttendance'
import AbsenceManagement from '@/pages/people/AbsenceManagement'
import PeopleAnalyticsPlaceholder from '@/pages/people/PeopleAnalyticsPlaceholder'

import LearningOverview from '@/pages/learning/LearningOverview'
import SkillsMatrix from '@/pages/learning/SkillsMatrix'
import CapabilityFramework from '@/pages/learning/CapabilityFramework'
import LearningHub from '@/pages/learning/LearningHub'
import SopLibrary from '@/pages/learning/SopLibrary'
import Assessments from '@/pages/learning/Assessments'
import PdpPlaceholder from '@/pages/learning/PdpPlaceholder'

import CompanyAdmin from '@/pages/admin/CompanyAdmin'
import PlatformAdmin from '@/pages/admin/PlatformAdmin'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { loading, session, memberships, isPlatformAdmin } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-muted">Loading…</div>
  }
  if (!session) return <Navigate to="/login" replace />
  if (memberships.length === 0 && !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-sm text-ink-muted max-w-sm">
          Your account isn't linked to a company yet. Contact your administrator for an invitation.
        </p>
      </div>
    )
  }
  return children
}

function Shell() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/people/overview" element={<PeopleOverview />} />
        <Route path="/people/directory" element={<EmployeeDirectory />} />
        <Route path="/people/directory/:employeeId" element={<EmployeeProfile />} />
        <Route path="/people/organisation" element={<OrganisationStructure />} />
        <Route path="/people/roles" element={<RolesPage />} />
        <Route path="/people/shifts" element={<ShiftsDashboard />} />
        <Route path="/people/attendance" element={<TimeAttendance />} />
        <Route path="/people/absence" element={<AbsenceManagement />} />
        <Route path="/people/analytics" element={<PeopleAnalyticsPlaceholder />} />

        <Route path="/learning/overview" element={<LearningOverview />} />
        <Route path="/learning/skills-matrix" element={<SkillsMatrix />} />
        <Route path="/learning/capability-framework" element={<CapabilityFramework />} />
        <Route path="/learning/hub" element={<LearningHub />} />
        <Route path="/learning/sop-library" element={<SopLibrary />} />
        <Route path="/learning/assessments" element={<Assessments />} />
        <Route path="/learning/pdp" element={<PdpPlaceholder />} />

        <Route path="/admin" element={<CompanyAdmin />} />
        <Route path="/admin/platform" element={<PlatformAdmin />} />

        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
