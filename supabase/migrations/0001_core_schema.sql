-- =========================================================
-- CHASM People — Core schema
-- Company -> Site -> Department -> Role -> Employee
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Profiles: one row per authenticated user (mirrors auth.users)
-- ---------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Platform administrators: can create companies and invite company admins.
-- Deliberately separate from company_memberships — platform admins are not
-- scoped to any single tenant.
create table platform_admins (
  user_id uuid primary key references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Companies (tenants)
-- ---------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry text,
  logo_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);

-- Membership links a user to a company with a role within that tenant.
create type membership_role as enum ('company_admin', 'manager', 'employee');

create table company_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  role membership_role not null default 'employee',
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index idx_company_memberships_user on company_memberships (user_id);
create index idx_company_memberships_company on company_memberships (company_id);

-- Pending invitations for users who don't have an account yet.
create table company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  email text not null,
  role membership_role not null default 'employee',
  invited_by uuid references profiles (id),
  token uuid not null default gen_random_uuid(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index idx_company_invitations_company on company_invitations (company_id);
create unique index idx_company_invitations_token on company_invitations (token);

-- ---------------------------------------------------------
-- Sites (beta shows one per company; schema supports many)
-- ---------------------------------------------------------
create table sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  address text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_sites_company on sites (company_id);

-- ---------------------------------------------------------
-- Departments
-- ---------------------------------------------------------
create table departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  site_id uuid not null references sites (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index idx_departments_company on departments (company_id);
create index idx_departments_site on departments (site_id);

-- ---------------------------------------------------------
-- Roles (job roles, not user/auth roles)
-- ---------------------------------------------------------
create table roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  title text not null,
  summary text,
  responsibilities text,
  hourly_rate numeric(10, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_roles_company on roles (company_id);
create index idx_roles_department on roles (department_id);

-- ---------------------------------------------------------
-- Employees
-- ---------------------------------------------------------
create type employment_status as enum ('active', 'on_leave', 'left');

create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  site_id uuid not null references sites (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  role_id uuid references roles (id) on delete set null,
  manager_id uuid references employees (id) on delete set null,
  user_id uuid references profiles (id) on delete set null,
  employee_number text,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  employment_status employment_status not null default 'active',
  contracted_hours numeric(5, 2) not null default 40,
  start_date date not null default current_date,
  avatar_color text, -- deterministic color for avatar initials, no photo needed for demo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_employees_company on employees (company_id);
create index idx_employees_department on employees (department_id);
create index idx_employees_role on employees (role_id);
create index idx_employees_manager on employees (manager_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_employees_updated_at
  before update on employees
  for each row execute function set_updated_at();
