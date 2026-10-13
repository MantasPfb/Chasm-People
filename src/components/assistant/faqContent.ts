export interface FaqEntry {
  id: string
  question: string
  answer: string
  route?: string
  routeLabel?: string
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'add-employee',
    question: 'How do I add a new employee?',
    answer:
      'Go to Employee Directory and click "Add employee" (top right). Fill in their name, role, department, manager, shift and start date — tier, pay type and holiday entitlement are set automatically from the role and can be adjusted afterwards.',
    route: '/people/directory',
    routeLabel: 'Open Employee Directory',
  },
  {
    id: 'edit-employee',
    question: "How do I edit an employee's details?",
    answer: 'From the Employee Directory, click any row to open their profile, or use the edit action next to their name to change department, role, manager, shift or status directly.',
    route: '/people/directory',
    routeLabel: 'Open Employee Directory',
  },
  {
    id: 'create-role',
    question: 'How do I create or edit a job role?',
    answer:
      'Employee Set-up & Roles and Responsibilities lists every role as a card. Click one to see its full job specification — purpose, responsibilities, person spec, reporting relationships — and use "Edit role details & capabilities" to change its tier, pay type, labour rate, or the capabilities it requires.',
    route: '/people/roles',
    routeLabel: 'Open Roles & Responsibilities',
  },
  {
    id: 'skills-matrix',
    question: 'How does the Skills Matrix work?',
    answer:
      "Each row is an employee, each column a capability their role requires. A dot shows their current competence level against what's required — the matrix is built directly from role requirements and assessment history, not hardcoded numbers, so it updates the moment a new assessment is recorded.",
    route: '/learning/skills-matrix',
    routeLabel: 'Open Skills Matrix',
  },
  {
    id: 'record-assessment',
    question: 'How do I record an assessment?',
    answer:
      'On the Assessments page, pick the employee, then pick one of the capabilities their role actually requires, set the level achieved (0–5), add a note if useful, and save. Previous assessments are never overwritten — a full history is kept.',
    route: '/learning/assessments',
    routeLabel: 'Open Assessments',
  },
  {
    id: 'holidays-absence',
    question: 'How do I manage holidays and absence?',
    answer:
      'Holidays & Absence Management shows entitlement vs. take-up alongside a rolling 12-month absence record. Click any employee to see their full instance history and complete a return-to-work form for any outstanding absence.',
    route: '/people/absence',
    routeLabel: 'Open Holidays & Absence Management',
  },
  {
    id: 'disciplinary-stage',
    question: 'How is the disciplinary stage worked out?',
    answer:
      'It\'s based on absence instances in the trailing 12 months: 3 triggers an informal discussion, 4 a verbal warning, 5 a written warning, 6 a final written warning, and 7+ potential dismissal. This is computed automatically — nothing needs to be set manually.',
    route: '/people/absence',
    routeLabel: 'Open Holidays & Absence Management',
  },
  {
    id: 'shift-patterns',
    question: "How do I change someone's shift pattern?",
    answer:
      'Edit the employee from the Employee Directory and change their Shift Pattern field. To see how any pattern actually rotates — who\'s on today, the 8-day cycle, who leads it — visit Shifts & Working Patterns.',
    route: '/people/shifts',
    routeLabel: 'Open Shifts & Working Patterns',
  },
  {
    id: 'time-attendance',
    question: 'How do I use Time & Attendance?',
    answer:
      'The roster grid shows everyone\'s status by day, falling back to their shift rotation unless overridden. Click "Select cells to apply status" to tick a name (whole row), a date header (whole column), or individual cells, then apply holiday/sickness/unauthorised in bulk. Click any single cell normally to see scheduled vs. actual clock times for that day.',
    route: '/people/attendance',
    routeLabel: 'Open Time & Attendance',
  },
  {
    id: 'sop-vs-capability',
    question: "What's the difference between a capability-linked SOP and a process SOP?",
    answer:
      'A capability-linked SOP is the documented standard an assessment is actually checked against — things like machine operation or food safety. A process SOP (like "Line Start-Up" or "Customer Complaint Handling") documents how a department works but isn\'t something an individual is assessed against, so it has no linked capability. Both live in the SOP Library.',
    route: '/learning/sop-library',
    routeLabel: 'Open SOP Library',
  },
  {
    id: 'learning-hub',
    question: 'How does Learning Hub self-certification work?',
    answer:
      'An employee reads the linked SOP (or capability description) and ticks "I confirm I have read and understood," which records Level 2 — Knowledge demonstrated. It can never downgrade an existing higher-level record, and practical competence (Level 3+) still needs a manager assessment.',
    route: '/learning/hub',
    routeLabel: 'Open Learning Hub',
  },
  {
    id: 'org-structure',
    question: 'How do I see the organisation chart?',
    answer:
      'Organisation Structure shows a live reporting tree built from each employee\'s assigned manager. Switch between a cross-site management overview and a single department\'s full structure — unfilled vacancies against the manning requirement show as dashed outlines.',
    route: '/people/organisation',
    routeLabel: 'Open Organisation Structure',
  },
]
