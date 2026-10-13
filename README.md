# CHASM People

A people management and learning & development platform for manufacturing and
operational businesses. This is the initial working foundation: a strong
shell, real authentication and tenant isolation, and the core end-to-end
journey — **Employee → Assigned Role → Required Capabilities → Current
Competence → Identified Gaps → Assessment → Updated Skills Matrix** — all
working against a real Supabase/Postgres backend.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Chart.js + react-chartjs-2
- Supabase (Postgres, Auth, Row Level Security)
- React Router

No Claude-specific services are used anywhere in this codebase — it runs
entirely on your own Supabase project and can be deployed to Vercel (or any
static host + Supabase) like any other React app.

## What's implemented in this beta

**People Management**
- Employee Directory: search, filter by department/shift/tier/status, add/edit, profiles
- Organisation Structure: a visual tree chart (not just a list) built from manager
  assignments, switchable between a cross-site management view and a single
  department's full structure, with unfilled vacancies shown as dashed nodes
  against the manning requirement
- Employee Set-up & Roles and Responsibilities: a full job specification per
  role (purpose, key responsibilities, person specification, live-computed
  reporting relationships, measures of success) alongside tier (Management/
  Indirect/Direct), pay type (Salaried/Hourly), labour rate and required
  capabilities
- Shifts & Working Patterns: a shift-first dashboard — today's status across
  every pattern, an 8-day rotation strip, and the live leadership tree for
  whichever shift is selected
- Time & Attendance: a roster grid (7 days to 12 months, or a custom range)
  with bulk status selection and a day-detail view showing scheduled vs.
  actual clock times
- Holidays & Absence Management: holiday entitlement/take-up alongside a
  rolling 12-month absence record, with disciplinary stage computed
  server-side and a full return-to-work form workflow
- People Overview: headcount, department/shift/tier filters, five charts,
  manning gap, and the holiday position table

**Learning & Development**
- Capability Framework: create capabilities across the three categories
  (Mandatory Compliance, Professional Capability, Operational Competence),
  each showing its linked SOP where one exists
- SOP Library: documented procedures linked to capabilities (or left
  unlinked, for departmental process documents that aren't an individual
  competence)
- Skills Matrix: a live, filterable matrix of required vs. current competence
  for every employee — built from real database relationships, not hardcoded
  numbers
- Assessments: record a competence level for an employee + capability, with
  the linked SOP surfaced as the standard to assess against; every
  assessment is kept as history (nothing is overwritten)
- Learning Hub: self-service e-learning — browse required/all modules, read
  the linked SOP or capability description, and self-certify at Level 2
  (Knowledge demonstrated); practical competence still requires a manager
  assessment, and the system won't let a self-certify downgrade an existing
  higher-level record
- L&D Overview: coverage by department/category, a skill-gap leaderboard,
  SOP review-status breakdown, and a "spotlight a skill" drill-down
- Employee Capability Profile: required vs. current per employee, with an
  overall completion percentage

**Platform**
- Platform Administrator role: create companies, invite the first company
  admin
- Company Administrator role: invite managers/employees to their own company
- Row Level Security enforced in Postgres so one company's data is never
  visible to another, regardless of what the frontend does

**Placeholders (clearly labelled, not functional yet)**
People Analytics, Personal Development Plans.

## Project structure

```
chasm-people/
├── supabase/migrations/        # SQL migrations — run these in order
├── src/
│   ├── lib/                    # Supabase client, shared types
│   ├── hooks/                  # Auth context + data-fetching hooks
│   ├── layouts/                # App shell: sidebar, topbar, layout
│   ├── components/ui/          # Shared UI primitives (cards, badges, etc.)
│   ├── components/people/      # Employee/role forms and modals
│   └── pages/
│       ├── auth/                Login, Accept Invite
│       ├── dashboard/           Main dashboard
│       ├── people/              People Management pillar
│       ├── learning/            Learning & Development pillar
│       └── admin/                Company Admin, Platform Admin
```

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the files in `supabase/migrations/` **in order**
   (0001 → 0009). Each one assumes the previous ones have already run — this
   has been verified end-to-end against a real Postgres 16 instance, so the
   whole chain is known to apply cleanly in order.
   - `0001_core_schema.sql` — companies, sites, departments, roles, employees,
     memberships
   - `0002_capability_schema.sql` — capabilities, role requirements,
     assessments, and the two views the app reads from
   - `0003_tier_paytype_shifts.sql` — Management/Indirect/Direct tier and
     Salaried/Hourly pay classification on roles and employees, shift
     patterns, and department manning requirements
   - `0004_attendance_absence.sql` — the Time & Attendance roster
     (`attendance_overrides`) and the Holidays & Absence Management history
     (`absence_records`), including a view that computes each employee's
     12-month disciplinary stage server-side
   - `0005_sops.sql` — the SOP Library, linked to capabilities via a
     many-to-many table (a SOP can back zero, one, or more capabilities),
     and the manager/Learning-Hub distinction on assessments
   - `0006_rls_policies.sql` — Row Level Security for every table from
     0001/0002
   - `0007_rls_policies_extended.sql` — Row Level Security for every table
     added in 0003–0005, including letting an employee read their own
     attendance/absence record even without a manager role
   - `0008_invitation_functions.sql` — the invite-acceptance flow
   - `0009_seed_demo_data.sql` — the demo company "Prototype - Factory of
     best Employees" with 111 employees across 11 departments, 31 roles,
     32 SOPs and a year of assessment/absence history — generated directly
     from the reviewed interactive demo, not retyped by hand
3. Create your own user and make it a **platform admin**, since that can't
   be done through the UI (by design — it's not something any signed-up user
   should be able to grant themselves):
   ```sql
   -- after signing up through the app's /login screen once (it will fail —
   -- that's fine, it just needs the auth.users row to exist), run:
   insert into platform_admins (user_id)
   select id from auth.users where email = 'you@yourcompany.com';
   ```
   Then, from **Platform Administration** in the app, create a company and
   invite yourself (or a colleague) as its company admin via the generated
   invitation link, or directly insert a `company_memberships` row for the
   demo company if you just want to explore the seeded data:
   ```sql
   insert into company_memberships (user_id, company_id, role)
   select
     (select id from auth.users where email = 'you@yourcompany.com'),
     (select id from companies where slug = 'prototype-factory'),
     'company_admin';
   ```
4. In **Project Settings → API**, copy the Project URL and the `anon` public
   key — not the `service_role` key, which must never appear in frontend
   code.

## 2. Run locally

```bash
npm install
cp .env.example .env
# edit .env with your Supabase URL and anon key
npm run dev
```

Visit `http://localhost:5173`, sign in, and you should see the seeded
"Prototype - Factory of best Employees" demo data.

## 3. Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, "Add New Project" → import the repo. Vercel will detect Vite
   automatically (`npm run build`, output directory `dist`).
3. Add the two environment variables from `.env.example` in Vercel's
   Project Settings → Environment Variables.
4. Deploy.

## Security notes

- The `anon` key is designed to be public; every table it can reach is
  protected by Row Level Security, so access control lives in Postgres, not
  in the frontend.
- The `service_role` key is never used in this app and must never be added
  to frontend environment variables.
- Platform admin status is granted only via direct database access (see
  above), never through the application UI, so it can't be self-granted by a
  signed-up user.
- Invitations in this beta generate a shareable link rather than sending an
  email — wiring up transactional email (e.g. via a Supabase Edge Function)
  is a natural next step before onboarding real companies.

## What's next

This foundation is intentionally scoped to the core journey. Natural next
modules, in roughly the order they'd add the most value:

1. Shifts & Working Patterns, feeding Time & Attendance
2. Holidays & Absence, with approval workflow
3. Personal Development Plans generated from skills-matrix gaps
4. Learning Hub content delivery and SOP Library
5. File storage (Supabase Storage) for employee documents and SOP media
6. Transactional email for invitations
7. Multi-site support in the UI (the database already supports it)
