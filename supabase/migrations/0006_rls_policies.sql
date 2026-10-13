-- =========================================================
-- CHASM People — Row Level Security
-- =========================================================

-- ---------------------------------------------------------
-- Helper functions (security definer: safe to call from RLS
-- policies without causing recursive RLS evaluation on the
-- tables they read).
-- ---------------------------------------------------------
create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

create or replace function is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from company_memberships
    where user_id = auth.uid() and company_id = target_company_id
  ) or is_platform_admin();
$$;

create or replace function has_company_role(target_company_id uuid, min_role membership_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_platform_admin() or exists (
    select 1 from company_memberships
    where user_id = auth.uid()
      and company_id = target_company_id
      and (
        min_role = 'employee'
        or (min_role = 'manager' and role in ('manager', 'company_admin'))
        or (min_role = 'company_admin' and role = 'company_admin')
      )
  );
$$;

-- ---------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------
alter table profiles enable row level security;
alter table platform_admins enable row level security;
alter table companies enable row level security;
alter table company_memberships enable row level security;
alter table company_invitations enable row level security;
alter table sites enable row level security;
alter table departments enable row level security;
alter table roles enable row level security;
alter table employees enable row level security;
alter table capabilities enable row level security;
alter table role_capabilities enable row level security;
alter table assessments enable row level security;

-- ---------------------------------------------------------
-- profiles: a user can read/update their own profile. Platform
-- admins can read all (needed to manage companies/invitations).
-- ---------------------------------------------------------
create policy "profiles_select_self_or_platform_admin"
  on profiles for select
  using (id = auth.uid() or is_platform_admin());

create policy "profiles_update_self"
  on profiles for update
  using (id = auth.uid());

create policy "profiles_insert_self"
  on profiles for insert
  with check (id = auth.uid());

-- ---------------------------------------------------------
-- platform_admins: only readable to platform admins themselves.
-- Managed via Supabase dashboard / service role, not the app.
-- ---------------------------------------------------------
create policy "platform_admins_select_self"
  on platform_admins for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------
-- companies: members can see their own company; platform admins
-- see and create all companies.
-- ---------------------------------------------------------
create policy "companies_select_member_or_platform_admin"
  on companies for select
  using (is_company_member(id));

create policy "companies_insert_platform_admin"
  on companies for insert
  with check (is_platform_admin());

create policy "companies_update_admin"
  on companies for update
  using (has_company_role(id, 'company_admin'));

-- ---------------------------------------------------------
-- company_memberships: visible to fellow members of the same
-- company; manageable by company admins (or platform admins).
-- ---------------------------------------------------------
create policy "memberships_select_same_company"
  on company_memberships for select
  using (is_company_member(company_id));

create policy "memberships_insert_admin"
  on company_memberships for insert
  with check (has_company_role(company_id, 'company_admin'));

create policy "memberships_update_admin"
  on company_memberships for update
  using (has_company_role(company_id, 'company_admin'));

create policy "memberships_delete_admin"
  on company_memberships for delete
  using (has_company_role(company_id, 'company_admin'));

-- ---------------------------------------------------------
-- company_invitations: admins of the company only.
-- ---------------------------------------------------------
create policy "invitations_select_admin"
  on company_invitations for select
  using (has_company_role(company_id, 'company_admin'));

create policy "invitations_insert_admin"
  on company_invitations for insert
  with check (has_company_role(company_id, 'company_admin'));

create policy "invitations_update_admin"
  on company_invitations for update
  using (has_company_role(company_id, 'company_admin'));

-- ---------------------------------------------------------
-- Generic tenant-scoped tables: sites, departments, roles,
-- employees, capabilities, role_capabilities, assessments.
-- Read: any member of the company. Write: manager or admin.
-- ---------------------------------------------------------

-- sites
create policy "sites_select_member" on sites for select using (is_company_member(company_id));
create policy "sites_write_manager" on sites for insert with check (has_company_role(company_id, 'manager'));
create policy "sites_update_manager" on sites for update using (has_company_role(company_id, 'manager'));
create policy "sites_delete_admin" on sites for delete using (has_company_role(company_id, 'company_admin'));

-- departments
create policy "departments_select_member" on departments for select using (is_company_member(company_id));
create policy "departments_write_manager" on departments for insert with check (has_company_role(company_id, 'manager'));
create policy "departments_update_manager" on departments for update using (has_company_role(company_id, 'manager'));
create policy "departments_delete_admin" on departments for delete using (has_company_role(company_id, 'company_admin'));

-- roles
create policy "roles_select_member" on roles for select using (is_company_member(company_id));
create policy "roles_write_manager" on roles for insert with check (has_company_role(company_id, 'manager'));
create policy "roles_update_manager" on roles for update using (has_company_role(company_id, 'manager'));
create policy "roles_delete_admin" on roles for delete using (has_company_role(company_id, 'company_admin'));

-- employees
create policy "employees_select_member" on employees for select using (is_company_member(company_id));
create policy "employees_write_manager" on employees for insert with check (has_company_role(company_id, 'manager'));
create policy "employees_update_manager" on employees for update using (has_company_role(company_id, 'manager'));
create policy "employees_delete_admin" on employees for delete using (has_company_role(company_id, 'company_admin'));

-- capabilities
create policy "capabilities_select_member" on capabilities for select using (is_company_member(company_id));
create policy "capabilities_write_manager" on capabilities for insert with check (has_company_role(company_id, 'manager'));
create policy "capabilities_update_manager" on capabilities for update using (has_company_role(company_id, 'manager'));
create policy "capabilities_delete_admin" on capabilities for delete using (has_company_role(company_id, 'company_admin'));

-- role_capabilities (scoped via the parent role's company)
create policy "role_capabilities_select_member"
  on role_capabilities for select
  using (exists (select 1 from roles r where r.id = role_id and is_company_member(r.company_id)));

create policy "role_capabilities_write_manager"
  on role_capabilities for insert
  with check (exists (select 1 from roles r where r.id = role_id and has_company_role(r.company_id, 'manager')));

create policy "role_capabilities_update_manager"
  on role_capabilities for update
  using (exists (select 1 from roles r where r.id = role_id and has_company_role(r.company_id, 'manager')));

create policy "role_capabilities_delete_manager"
  on role_capabilities for delete
  using (exists (select 1 from roles r where r.id = role_id and has_company_role(r.company_id, 'manager')));

-- assessments
create policy "assessments_select_member" on assessments for select using (is_company_member(company_id));
create policy "assessments_insert_manager" on assessments for insert with check (has_company_role(company_id, 'manager'));
-- Assessments are append-only evidence: no update/delete policy is defined,
-- so corrections are made by recording a new assessment.

-- ---------------------------------------------------------
-- Views must run with the querying user's permissions (not the
-- view owner's) so the RLS policies above are actually applied.
-- ---------------------------------------------------------
alter view current_competence set (security_invoker = true);
alter view employee_capability_status set (security_invoker = true);
