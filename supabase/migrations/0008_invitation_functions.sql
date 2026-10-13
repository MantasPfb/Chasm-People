-- =========================================================
-- CHASM People — Invitation acceptance flow
--
-- Company admins create a row in company_invitations (RLS-protected,
-- see 0003). The invited person is sent the resulting token out of
-- band (email, for now sent manually or via a future email integration).
-- These two functions let an unauthenticated visitor look up the
-- invitation to pre-fill their sign-up form, and let a freshly
-- authenticated user redeem it to join the company — without ever
-- exposing other companies' invitation data.
-- =========================================================

create or replace function get_invitation(p_token uuid)
returns table (
  email text,
  role membership_role,
  company_name text,
  is_expired boolean,
  is_accepted boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ci.email,
    ci.role,
    c.name as company_name,
    ci.expires_at < now() as is_expired,
    ci.accepted_at is not null as is_accepted
  from company_invitations ci
  join companies c on c.id = ci.company_id
  where ci.token = p_token;
$$;

grant execute on function get_invitation(uuid) to anon, authenticated;

create or replace function accept_invitation(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation company_invitations;
  v_user_email text;
begin
  select email into v_user_email from auth.users where id = auth.uid();
  if v_user_email is null then
    raise exception 'You must be signed in to accept an invitation.';
  end if;

  select * into v_invitation from company_invitations where token = p_token;
  if v_invitation is null then
    raise exception 'Invitation not found.';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'This invitation has already been used.';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'This invitation has expired.';
  end if;
  if lower(v_invitation.email) <> lower(v_user_email) then
    raise exception 'This invitation was issued to a different email address.';
  end if;

  insert into profiles (id, full_name, email)
  values (auth.uid(), split_part(v_user_email, '@', 1), v_user_email)
  on conflict (id) do nothing;

  insert into company_memberships (user_id, company_id, role)
  values (auth.uid(), v_invitation.company_id, v_invitation.role)
  on conflict (user_id, company_id) do nothing;

  update company_invitations set accepted_at = now() where id = v_invitation.id;
end;
$$;

grant execute on function accept_invitation(uuid) to authenticated;
