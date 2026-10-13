-- =========================================================
-- CHASM People — Time & Attendance / Holidays & Absence
--
-- attendance_overrides: a sparse table. An employee/date pair
-- with no row here falls back to their shift rotation (working
-- vs. rest), computed in the application layer exactly as the
-- interactive demo does. A row here means the day has been
-- explicitly set to something else (holiday, sickness,
-- unauthorised absence, or an explicit working/rest override).
--
-- absence_records: the append-evidence history behind the
-- Holidays & Absence Management disciplinary triggers — each
-- row is one continuous absence spell, with its own
-- return-to-work record once completed.
-- =========================================================

create type attendance_status as enum ('working', 'rest', 'holiday', 'sickness', 'unauthorised');
create type absence_type as enum ('sickness', 'unauthorised');

create table attendance_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  attendance_date date not null,
  status attendance_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, attendance_date)
);

create index idx_attendance_overrides_company on attendance_overrides (company_id);
create index idx_attendance_overrides_employee_date on attendance_overrides (employee_id, attendance_date);

create trigger trg_attendance_overrides_updated_at
  before update on attendance_overrides
  for each row execute function set_updated_at();

create table absence_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days integer not null check (days > 0),
  type absence_type not null,
  reason text,
  return_to_work_completed boolean not null default false,
  rtw jsonb, -- { interviewDate, reasonConfirmed, support, conductedBy, fitToReturn }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_absence_records_company on absence_records (company_id);
create index idx_absence_records_employee on absence_records (employee_id);
create index idx_absence_records_start_date on absence_records (start_date desc);

create trigger trg_absence_records_updated_at
  before update on absence_records
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Convenience view: 12-month absence summary + disciplinary
-- stage per employee, mirroring the interactive demo's logic
-- (3 informal discussion, 4 verbal, 5 written, 6 final written,
-- 7+ potential dismissal) so the app doesn't need to recompute
-- it client-side from raw rows every render.
-- ---------------------------------------------------------
create view employee_absence_summary as
  select
    e.id as employee_id,
    e.company_id,
    count(a.id) as instances_12mo,
    coalesce(sum(a.days), 0) as days_12mo,
    count(a.id) filter (where not a.return_to_work_completed) as outstanding_rtw,
    case
      when count(a.id) >= 7 then 'potential_dismissal'
      when count(a.id) = 6 then 'final_written_warning'
      when count(a.id) = 5 then 'written_warning'
      when count(a.id) = 4 then 'verbal_warning'
      when count(a.id) = 3 then 'informal_discussion'
      else null
    end as disciplinary_stage
  from employees e
  left join absence_records a
    on a.employee_id = e.id and a.start_date >= (current_date - interval '365 days')
  where e.employment_status <> 'left'
  group by e.id, e.company_id;

alter view employee_absence_summary set (security_invoker = true);
