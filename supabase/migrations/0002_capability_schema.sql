-- =========================================================
-- CHASM People — Learning & Development: capability framework
-- =========================================================

create type capability_category as enum (
  'mandatory_compliance',
  'professional_capability',
  'operational_competence'
);

-- ---------------------------------------------------------
-- Capabilities (company-defined, categorised)
-- ---------------------------------------------------------
create table capabilities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  description text,
  category capability_category not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_capabilities_company on capabilities (company_id);
create index idx_capabilities_category on capabilities (category);

-- ---------------------------------------------------------
-- Role <-> Capability requirements
-- competence scale: 0 Not trained, 1 Training assigned,
-- 2 Knowledge demonstrated, 3 Can perform with supervision,
-- 4 Competent independently, 5 Trainer / assessor
-- ---------------------------------------------------------
create table role_capabilities (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles (id) on delete cascade,
  capability_id uuid not null references capabilities (id) on delete cascade,
  required_level smallint not null check (required_level between 0 and 5),
  created_at timestamptz not null default now(),
  unique (role_id, capability_id)
);

create index idx_role_capabilities_role on role_capabilities (role_id);
create index idx_role_capabilities_capability on role_capabilities (capability_id);

-- ---------------------------------------------------------
-- Assessments: append-only history. The current competence level
-- for an employee/capability pair is the most recent assessment.
-- ---------------------------------------------------------
create table assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  capability_id uuid not null references capabilities (id) on delete cascade,
  assessor_id uuid references employees (id) on delete set null,
  level_achieved smallint not null check (level_achieved between 0 and 5),
  notes text,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_assessments_company on assessments (company_id);
create index idx_assessments_employee on assessments (employee_id);
create index idx_assessments_capability on assessments (capability_id);
create index idx_assessments_employee_capability on assessments (employee_id, capability_id, assessed_at desc);

-- ---------------------------------------------------------
-- Convenience view: latest competence level per employee/capability
-- ---------------------------------------------------------
create view current_competence as
  select distinct on (employee_id, capability_id)
    employee_id,
    capability_id,
    level_achieved,
    assessed_at,
    assessor_id,
    company_id
  from assessments
  order by employee_id, capability_id, assessed_at desc;

-- ---------------------------------------------------------
-- Convenience view: required vs current, with gap, per employee
-- Joins through the employee's current role.
-- ---------------------------------------------------------
create view employee_capability_status as
  select
    e.id as employee_id,
    e.company_id,
    e.role_id,
    rc.capability_id,
    c.name as capability_name,
    c.category,
    rc.required_level,
    coalesce(cc.level_achieved, 0) as current_level,
    greatest(rc.required_level - coalesce(cc.level_achieved, 0), 0) as gap,
    cc.assessed_at as last_assessed_at
  from employees e
  join role_capabilities rc on rc.role_id = e.role_id
  join capabilities c on c.id = rc.capability_id
  left join current_competence cc
    on cc.employee_id = e.id and cc.capability_id = rc.capability_id
  where e.employment_status = 'active';
