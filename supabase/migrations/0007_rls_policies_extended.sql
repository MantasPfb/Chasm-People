-- =========================================================
-- CHASM People — RLS for shifts, manning requirements,
-- attendance, absence and SOPs.
--
-- Same tenant-isolation pattern as 0003: is_company_member()
-- for read, has_company_role(..., 'manager') for write,
-- has_company_role(..., 'company_admin') for delete. Attendance
-- and absence data additionally let an employee read their own
-- record even without a manager/admin role — HR data about
-- yourself should be visible to you.
-- =========================================================

alter table shifts enable row level security;
alter table manning_requirements enable row level security;
alter table attendance_overrides enable row level security;
alter table absence_records enable row level security;
alter table sops enable row level security;
alter table sop_capabilities enable row level security;

-- shifts
create policy "shifts_select_member" on shifts for select using (is_company_member(company_id));
create policy "shifts_write_manager" on shifts for insert with check (has_company_role(company_id, 'manager'));
create policy "shifts_update_manager" on shifts for update using (has_company_role(company_id, 'manager'));
create policy "shifts_delete_admin" on shifts for delete using (has_company_role(company_id, 'company_admin'));

-- manning_requirements
create policy "manning_select_member" on manning_requirements for select using (is_company_member(company_id));
create policy "manning_write_manager" on manning_requirements for insert with check (has_company_role(company_id, 'manager'));
create policy "manning_update_manager" on manning_requirements for update using (has_company_role(company_id, 'manager'));
create policy "manning_delete_admin" on manning_requirements for delete using (has_company_role(company_id, 'company_admin'));

-- attendance_overrides: managers see/manage everyone in the company;
-- an employee can additionally see their own record.
create policy "attendance_select_self_or_manager" on attendance_overrides for select
  using (
    has_company_role(company_id, 'manager')
    or employee_id in (select id from employees where user_id = auth.uid())
  );
create policy "attendance_write_manager" on attendance_overrides for insert with check (has_company_role(company_id, 'manager'));
create policy "attendance_update_manager" on attendance_overrides for update using (has_company_role(company_id, 'manager'));
create policy "attendance_delete_manager" on attendance_overrides for delete using (has_company_role(company_id, 'manager'));

-- absence_records: same self-or-manager read pattern; only a manager
-- can log an absence or complete a return-to-work form.
create policy "absence_select_self_or_manager" on absence_records for select
  using (
    has_company_role(company_id, 'manager')
    or employee_id in (select id from employees where user_id = auth.uid())
  );
create policy "absence_write_manager" on absence_records for insert with check (has_company_role(company_id, 'manager'));
create policy "absence_update_manager" on absence_records for update using (has_company_role(company_id, 'manager'));
create policy "absence_delete_admin" on absence_records for delete using (has_company_role(company_id, 'company_admin'));

-- sops
create policy "sops_select_member" on sops for select using (is_company_member(company_id));
create policy "sops_write_manager" on sops for insert with check (has_company_role(company_id, 'manager'));
create policy "sops_update_manager" on sops for update using (has_company_role(company_id, 'manager'));
create policy "sops_delete_admin" on sops for delete using (has_company_role(company_id, 'company_admin'));

-- sop_capabilities (scoped via the parent SOP's company)
create policy "sop_capabilities_select_member"
  on sop_capabilities for select
  using (exists (select 1 from sops s where s.id = sop_id and is_company_member(s.company_id)));
create policy "sop_capabilities_write_manager"
  on sop_capabilities for insert
  with check (exists (select 1 from sops s where s.id = sop_id and has_company_role(s.company_id, 'manager')));
create policy "sop_capabilities_delete_manager"
  on sop_capabilities for delete
  using (exists (select 1 from sops s where s.id = sop_id and has_company_role(s.company_id, 'manager')));
