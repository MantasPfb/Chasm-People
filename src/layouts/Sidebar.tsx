import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  label: string
  to: string
}

const peopleNav: NavItem[] = [
  { label: 'People Overview', to: '/people/overview' },
  { label: 'Employee Directory', to: '/people/directory' },
  { label: 'Organisation Structure', to: '/people/organisation' },
  { label: 'Employee Set-up & Roles and Responsibilities', to: '/people/roles' },
  { label: 'Shifts & Working Patterns', to: '/people/shifts' },
  { label: 'Time & Attendance', to: '/people/attendance' },
  { label: 'Holidays & Absence Management', to: '/people/absence' },
  { label: 'People Analytics', to: '/people/analytics' },
]

const learningNav: NavItem[] = [
  { label: 'L&D Overview', to: '/learning/overview' },
  { label: 'Skills Matrix', to: '/learning/skills-matrix' },
  { label: 'Capability Framework', to: '/learning/capability-framework' },
  { label: 'Learning Hub', to: '/learning/hub' },
  { label: 'SOP Library', to: '/learning/sop-library' },
  { label: 'Assessments', to: '/learning/assessments' },
  { label: 'Personal Development Plans', to: '/learning/pdp' },
]

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-6">
      <p className="px-3 mb-2 text-[11px] font-semibold text-side-ink-muted tracking-wide">{title}</p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded pl-[9px] pr-3 py-1.5 text-sm transition-colors border-l-[3px] ${
                isActive
                  ? 'bg-side-light text-white font-medium border-accent'
                  : 'text-side-ink hover:bg-side-light/60 hover:text-white border-transparent'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Sidebar() {
  const { isPlatformAdmin } = useAuth()
  return (
    <aside className="w-60 flex-shrink-0 border-r border-side-light bg-side h-screen sticky top-0 overflow-y-auto">
      <div className="px-4 py-5 border-b border-side-light">
        <p className="text-base font-semibold tracking-tight text-white font-display">CHASM People</p>
        <p className="text-xs text-side-ink-muted mt-0.5">People &amp; capability platform</p>
      </div>

      <div className="px-2 pt-4">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `block rounded pl-[9px] pr-3 py-1.5 mb-5 text-sm transition-colors border-l-[3px] ${
              isActive
                ? 'bg-side-light text-white font-medium border-accent'
                : 'text-side-ink hover:bg-side-light/60 hover:text-white border-transparent'
            }`
          }
        >
          Dashboard
        </NavLink>

        <NavSection title="PEOPLE MANAGEMENT" items={peopleNav} />
        <NavSection title="LEARNING & DEVELOPMENT" items={learningNav} />

        <div className="mb-6">
          <p className="px-3 mb-2 text-[11px] font-semibold text-side-ink-muted tracking-wide">ADMINISTRATION</p>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `block rounded pl-[9px] pr-3 py-1.5 text-sm transition-colors border-l-[3px] ${
                isActive
                  ? 'bg-side-light text-white font-medium border-accent'
                  : 'text-side-ink hover:bg-side-light/60 hover:text-white border-transparent'
              }`
            }
          >
            Company Administration
          </NavLink>
          {isPlatformAdmin && (
            <NavLink
              to="/admin/platform"
              className={({ isActive }) =>
                `block rounded pl-[9px] pr-3 py-1.5 mt-0.5 text-sm transition-colors border-l-[3px] ${
                  isActive
                    ? 'bg-side-light text-white font-medium border-accent'
                    : 'text-side-ink hover:bg-side-light/60 hover:text-white border-transparent'
                }`
              }
            >
              Platform Administration
            </NavLink>
          )}
        </div>
      </div>
    </aside>
  )
}
