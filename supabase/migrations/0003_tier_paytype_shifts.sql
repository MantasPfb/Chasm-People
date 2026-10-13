-- =========================================================
-- CHASM People — Tier / pay-type / shift model
--
-- Adds the Management / Indirect / Direct tier and Salaried /
-- Hourly pay classification to roles and employees, and
-- introduces shift patterns as a company-scoped lookup table
-- (so each company can define its own patterns — the demo
-- seeds the standard Mon-Fri / 4-on-4-off set).
-- =========================================================

create type employee_tier as enum ('management', 'indirect', 'direct');
create type pay_type as enum ('salaried', 'hourly');

alter table roles
  add column tier employee_tier not null default 'direct',
  add column pay_type pay_type not null default 'hourly',
  add column domain_note text,
  add column domain_kpis text[] not null default '{}';

-- ---------------------------------------------------------
-- Shift patterns
-- ---------------------------------------------------------
create table shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  pattern_description text,
  created_at timestamptz not null default now()
);

create index idx_shifts_company on shifts (company_id);

alter table employees
  add column tier employee_tier not null default 'direct',
  add column pay_type pay_type not null default 'hourly',
  add column shift_id uuid references shifts (id) on delete set null,
  add column clock_number text,
  add column holiday_entitlement_days numeric(5, 1) not null default 25,
  add column holiday_taken_days numeric(5, 1) not null default 0;

create index idx_employees_shift on employees (shift_id);
create unique index idx_employees_clock_number on employees (company_id, clock_number);

-- ---------------------------------------------------------
-- Manning requirements: target headcount per department, used
-- to compute the recruitment gap on the Dashboard and People
-- Overview.
-- ---------------------------------------------------------
create table manning_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  department_id uuid not null references departments (id) on delete cascade,
  required_headcount integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id)
);

create index idx_manning_requirements_company on manning_requirements (company_id);

create trigger trg_manning_requirements_updated_at
  before update on manning_requirements
  for each row execute function set_updated_at();
