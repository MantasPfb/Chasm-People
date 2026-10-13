import { Badge } from '@/components/ui/Primitives'
import { PAYTYPE_LABELS, TIER_LABELS, type EmployeeTier, type Role } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

const PERSON_SPEC_BY_TIER: Record<EmployeeTier, { qualifications: string[]; skills: string[] }> = {
  management: {
    qualifications: [
      "Degree or equivalent professional qualification in a relevant discipline, or substantial demonstrable experience in a comparable senior role",
      "A minimum of 5 years' experience in a manufacturing or industrial environment, including at least 2 years in a management or senior supervisory capacity",
    ],
    skills: [
      'Proven ability to lead, coach and develop a team to deliver against demanding targets',
      'Strong analytical and problem-solving skills, with the ability to translate data into clear action',
      'Confident communicator, able to influence stakeholders at all levels including senior leadership',
      'Sound commercial and financial awareness, including budget ownership and cost control',
      'Resilient under pressure, with the judgement to prioritise competing demands in a fast-moving environment',
    ],
  },
  indirect: {
    qualifications: [
      'Relevant vocational qualification, apprenticeship or equivalent experience in a related discipline',
      'Previous experience in a similar role within a manufacturing, FMCG or industrial environment is desirable',
    ],
    skills: [
      'Well organised, with strong attention to detail and accurate record-keeping',
      'Confident using standard office and site systems (e.g. ERP, Excel, quality/maintenance systems)',
      'Clear communicator, comfortable liaising with colleagues across departments and shifts',
      'Able to work on own initiative while knowing when to escalate issues appropriately',
      'Committed to continuous improvement and willing to challenge existing ways of working',
    ],
  },
  direct: {
    qualifications: [
      'Right to work in the UK; no formal qualifications required, though relevant experience is an advantage',
      'Previous experience in a manufacturing, warehouse or production environment is desirable but not essential — full training provided',
    ],
    skills: [
      'Reliable, punctual and safety-conscious, with pride in producing high-quality work',
      'Able to follow standard operating procedures and work instructions accurately and consistently',
      'Good teamwork and communication skills, including clear shift handovers',
      'Physically able to meet the demands of a production environment, including manual handling where required',
      'Positive, flexible attitude towards shift patterns, overtime and changing priorities',
    ],
  },
}

const KPI_BY_TIER: Record<EmployeeTier, string[]> = {
  management: [
    'Department safety performance (incidents, near-misses, audit compliance)',
    'Headcount vs. agreed manning plan, including vacancy and turnover management',
    'Capability and compliance coverage across the team at or above site target',
    'Delivery of agreed departmental KPIs within budget',
  ],
  indirect: [
    'Accuracy and timeliness of records, reports and administrative tasks owned by the role',
    'Responsiveness to requests and escalations from the shift floor or stakeholders',
    'Contribution to continuous improvement activity within the department',
  ],
  direct: [
    'Output delivered to standard rate and specification',
    'Right-first-time quality performance',
    'Adherence to safety procedures, PPE requirements and site standards',
    'Attendance, punctuality and shift handover quality',
  ],
}

function getReportsTo(role: Role, employees: EmployeeWithRefs[]): string {
  const emp = employees.find((e) => e.role_id === role.id)
  if (!emp || !emp.manager_id) return 'No line manager — top of the site structure'
  const mgr = employees.find((e) => e.id === emp.manager_id)
  return mgr?.role?.title ?? '—'
}

function getDirectReports(role: Role, employees: EmployeeWithRefs[]): string[] {
  const holderIds = new Set(employees.filter((e) => e.role_id === role.id).map((e) => e.id))
  const titles = new Set<string>()
  employees.forEach((e) => {
    if (e.manager_id && holderIds.has(e.manager_id) && e.role?.title) titles.add(e.role.title)
  })
  return Array.from(titles)
}

function getTypicalShift(role: Role, employees: EmployeeWithRefs[]): { name: string; uniform: boolean } | null {
  const holders = employees.filter((e) => e.role_id === role.id && e.shift)
  if (holders.length === 0) return null
  const counts = new Map<string, number>()
  holders.forEach((e) => {
    const name = e.shift!.name
    counts.set(name, (counts.get(name) ?? 0) + 1)
  })
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  return { name: entries[0][0], uniform: entries.length === 1 }
}

export function JobSpecification({
  role,
  department,
  employees,
}: {
  role: Role
  department: { id: string; name: string } | null
  employees: EmployeeWithRefs[]
}) {
  const spec = PERSON_SPEC_BY_TIER[role.tier]
  const kpis = [...KPI_BY_TIER[role.tier], ...(role.domain_kpis ?? [])]
  const responsibilities = (role.responsibilities ?? '').split('\n').filter(Boolean)
  const reportsTo = getReportsTo(role, employees)
  const directReports = getDirectReports(role, employees)
  const typicalShift = getTypicalShift(role, employees)
  const headcount = employees.filter((e) => e.role_id === role.id && e.employment_status === 'active').length

  return (
    <div>
      <div className="flex gap-1.5 mb-3.5">
        <Badge tone="accent">{department ? department.name : 'Unassigned'}</Badge>
        <Badge>{TIER_LABELS[role.tier]}</Badge>
        <Badge>{PAYTYPE_LABELS[role.pay_type]}</Badge>
      </div>

      <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-1">Job Purpose</p>
      <p className="text-sm leading-relaxed mb-5">{role.summary}</p>

      {responsibilities.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Key Responsibilities</p>
          <ul className="pl-5 space-y-1.5">
            {responsibilities.map((line, i) => (
              <li key={i} className="text-[13.5px] leading-relaxed">{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Qualifications &amp; Experience</p>
          <ul className="pl-5 space-y-1.5">
            {spec.qualifications.map((line, i) => (
              <li key={i} className="text-[13px] text-ink-muted leading-relaxed">{line}</li>
            ))}
            {role.domain_note && <li className="text-[13px] text-ink-muted leading-relaxed">{role.domain_note}</li>}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Skills &amp; Attributes</p>
          <ul className="pl-5 space-y-1.5">
            {spec.skills.map((line, i) => (
              <li key={i} className="text-[13px] text-ink-muted leading-relaxed">{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Key Relationships</p>
          <Row label="Reports to" value={reportsTo} />
          <Row label="Direct reports" value={directReports.length ? directReports.join(', ') : 'None'} />
          <Row label="Department" value={department ? department.name : '—'} />
          <Row label="Current headcount" value={String(headcount)} />
        </div>
        <div>
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Working Pattern</p>
          <Row label="Typical shift" value={typicalShift ? typicalShift.name + (typicalShift.uniform ? '' : ' (varies)') : '—'} />
          <Row label="Pay type" value={PAYTYPE_LABELS[role.pay_type]} />
          <Row label="Indicative rate" value={role.hourly_rate ? `£${Number(role.hourly_rate).toFixed(2)}/hr equiv.` : '—'} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Measures of Success</p>
        <ul className="pl-5 space-y-1.5">
          {kpis.map((line, i) => (
            <li key={i} className="text-[13px] text-ink-muted leading-relaxed">{line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm mb-2 last:mb-0">
      <span className="text-ink-faint">{label}</span>
      <span className="font-medium text-right ml-2">{value}</span>
    </div>
  )
}
