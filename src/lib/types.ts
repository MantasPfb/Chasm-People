export type MembershipRole = 'company_admin' | 'manager' | 'employee'
export type EmploymentStatus = 'active' | 'on_leave' | 'left'
export type CapabilityCategory =
  | 'mandatory_compliance'
  | 'professional_capability'
  | 'operational_competence'
export type EmployeeTier = 'management' | 'indirect' | 'direct'
export type PayType = 'salaried' | 'hourly'
export type AttendanceStatus = 'working' | 'rest' | 'holiday' | 'sickness' | 'unauthorised'
export type AbsenceType = 'sickness' | 'unauthorised'
export type AssessmentSource = 'manager' | 'learning_hub'
export type DisciplinaryStage =
  | 'informal_discussion'
  | 'verbal_warning'
  | 'written_warning'
  | 'final_written_warning'
  | 'potential_dismissal'

export interface Profile {
  id: string
  full_name: string
  email: string
}

export interface Company {
  id: string
  name: string
  slug: string
  industry: string | null
  logo_url: string | null
  is_demo: boolean
}

export interface CompanyMembership {
  id: string
  user_id: string
  company_id: string
  role: MembershipRole
}

export interface Site {
  id: string
  company_id: string
  name: string
  address: string | null
  is_primary: boolean
}

export interface Department {
  id: string
  company_id: string
  site_id: string
  name: string
  description: string | null
}

export interface Role {
  id: string
  company_id: string
  department_id: string | null
  title: string
  summary: string | null
  responsibilities: string | null
  hourly_rate: number | null
  is_active: boolean
  tier: EmployeeTier
  pay_type: PayType
  domain_note: string | null
  domain_kpis: string[]
}

export interface Employee {
  id: string
  company_id: string
  site_id: string
  department_id: string | null
  role_id: string | null
  manager_id: string | null
  user_id: string | null
  employee_number: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  employment_status: EmploymentStatus
  contracted_hours: number
  start_date: string
  avatar_color: string | null
  tier: EmployeeTier
  pay_type: PayType
  shift_id: string | null
  clock_number: string | null
  holiday_entitlement_days: number
  holiday_taken_days: number
}

export interface Shift {
  id: string
  company_id: string
  name: string
  pattern_description: string | null
}

export interface ManningRequirement {
  id: string
  company_id: string
  department_id: string
  required_headcount: number
}

export interface Sop {
  id: string
  company_id: string
  department_id: string | null
  code: string
  title: string
  version: string
  owner: string | null
  summary: string | null
  steps: string[]
  last_reviewed: string
  review_due: string | null
}

export interface AttendanceOverride {
  id: string
  company_id: string
  employee_id: string
  attendance_date: string
  status: AttendanceStatus
}

export interface ReturnToWorkForm {
  interviewDate: string
  reasonConfirmed: string
  support: string
  conductedBy: string
  fitToReturn: boolean
}

export interface AbsenceRecord {
  id: string
  company_id: string
  employee_id: string
  start_date: string
  end_date: string
  days: number
  type: AbsenceType
  reason: string | null
  return_to_work_completed: boolean
  rtw: ReturnToWorkForm | null
}

export interface EmployeeAbsenceSummary {
  employee_id: string
  company_id: string
  instances_12mo: number
  days_12mo: number
  outstanding_rtw: number
  disciplinary_stage: DisciplinaryStage | null
}

export interface Capability {
  id: string
  company_id: string
  name: string
  description: string | null
  category: CapabilityCategory
  is_active: boolean
}

export interface RoleCapability {
  id: string
  role_id: string
  capability_id: string
  required_level: number
}

export interface Assessment {
  id: string
  company_id: string
  employee_id: string
  capability_id: string
  assessor_id: string | null
  level_achieved: number
  notes: string | null
  assessed_at: string
  source: AssessmentSource
}

export interface EmployeeCapabilityStatus {
  employee_id: string
  company_id: string
  role_id: string | null
  capability_id: string
  capability_name: string
  category: CapabilityCategory
  required_level: number
  current_level: number
  gap: number
  last_assessed_at: string | null
}

export const COMPETENCE_LEVELS: { level: number; label: string }[] = [
  { level: 0, label: 'Not trained' },
  { level: 1, label: 'Training assigned' },
  { level: 2, label: 'Knowledge demonstrated' },
  { level: 3, label: 'Can perform with supervision' },
  { level: 4, label: 'Competent independently' },
  { level: 5, label: 'Trainer / assessor' },
]

export const CAPABILITY_CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  mandatory_compliance: 'Mandatory Compliance',
  professional_capability: 'Professional Capability',
  operational_competence: 'Operational Competence',
}

export const TIER_LABELS: Record<EmployeeTier, string> = {
  management: 'Management',
  indirect: 'Indirect',
  direct: 'Direct',
}

export const PAYTYPE_LABELS: Record<PayType, string> = {
  salaried: 'Salaried',
  hourly: 'Hourly paid',
}

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, { label: string; tone: 'good' | 'default' | 'brightblue' | 'critical' | 'amber' }> = {
  working: { label: 'Working', tone: 'good' },
  rest: { label: 'Rest', tone: 'default' },
  holiday: { label: 'Holiday', tone: 'brightblue' },
  sickness: { label: 'Sickness', tone: 'critical' },
  unauthorised: { label: 'Unauthorised', tone: 'amber' },
}

export const DISCIPLINARY_STAGE_META: Record<DisciplinaryStage, { label: string; tone: 'default' | 'amber' | 'critical' }> = {
  informal_discussion: { label: 'Informal discussion', tone: 'default' },
  verbal_warning: { label: 'Verbal warning', tone: 'amber' },
  written_warning: { label: 'Written warning', tone: 'amber' },
  final_written_warning: { label: 'Final written warning', tone: 'critical' },
  potential_dismissal: { label: 'Potential dismissal', tone: 'critical' },
}
