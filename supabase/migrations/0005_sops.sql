-- =========================================================
-- CHASM People — SOP Library
--
-- An SOP may be linked to zero, one, or more capabilities via
-- sop_capabilities. Zero links means it's a departmental
-- process document (e.g. "Daily Performance Review") rather
-- than a procedure an individual is assessed against —
-- Professional Capability items are never linked, by design.
-- =========================================================

create table sops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  code text not null,
  title text not null,
  version text not null default 'v1.0',
  owner text,
  summary text,
  steps text[] not null default '{}',
  last_reviewed date not null default current_date,
  review_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index idx_sops_company on sops (company_id);
create index idx_sops_department on sops (department_id);

create trigger trg_sops_updated_at
  before update on sops
  for each row execute function set_updated_at();

create table sop_capabilities (
  sop_id uuid not null references sops (id) on delete cascade,
  capability_id uuid not null references capabilities (id) on delete cascade,
  primary key (sop_id, capability_id)
);

create index idx_sop_capabilities_capability on sop_capabilities (capability_id);

-- ---------------------------------------------------------
-- Distinguish a manager's assessment from an employee's own
-- Learning Hub self-sign-off (capped at level 2 — "Knowledge
-- demonstrated" — in the application layer; practical
-- competence at level 3+ still requires a manager assessment).
-- ---------------------------------------------------------
alter table assessments
  add column source text not null default 'manager' check (source in ('manager', 'learning_hub'));

-- ---------------------------------------------------------
-- Convenience view: each SOP alongside the capability(ies) it
-- backs, for the Capability Framework and Skills Matrix links.
-- ---------------------------------------------------------
create view sop_with_capabilities as
  select
    s.id as sop_id,
    s.company_id,
    s.code,
    s.title,
    array_remove(array_agg(sc.capability_id), null) as capability_ids
  from sops s
  left join sop_capabilities sc on sc.sop_id = s.id
  group by s.id, s.company_id, s.code, s.title;

alter view sop_with_capabilities set (security_invoker = true);
