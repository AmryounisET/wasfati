-- =============================================================================
-- WASFATI — Row Level Security policies
-- Implements Project Rule #4 "Privacy by design": every table defaults to
-- deny-all; access is granted only via the policies below. Run after
-- schema.sql.
-- =============================================================================

-- Helper: is the current user an admin (any role)?
create function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$ language sql stable security definer;

-- Helper: is the current user a linked, active caregiver for [owner_id]?
create function public.is_linked_caregiver(owner_id uuid, need_health_profile boolean default false)
returns boolean as $$
  select exists (
    select 1 from public.care_circle_links
    where owner_user_id = owner_id
      and caregiver_user_id = auth.uid()
      and status = 'linked'
      and (not need_health_profile or can_view_health_profile)
  );
$$ language sql stable security definer;

-- admin_list_users — the admin panel's user-directory query. `profiles` has
-- no email/last-sign-in columns (those live in auth.users, which PostgREST
-- doesn't expose and RLS can't reach from the client), so this is a
-- security-definer function: it runs with elevated privileges to join
-- auth.users, but checks is_admin() itself before returning anything —
-- the same effect as an admin-only RLS policy, without needing the
-- service-role key in the app at all.
create function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  user_type text,
  phone_number text,
  is_active boolean,
  language_code text,
  created_at timestamptz,
  email text,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  -- Explicit ::text casts matter here: auth.users.email is `character
  -- varying`, not `text`, in Supabase's schema — without the cast, Postgres
  -- raises "structure of query does not match function result type"
  -- because the declared RETURNS TABLE type doesn't match the query's.
  return query
    select p.id, p.full_name::text, p.user_type::text, p.phone_number::text, p.is_active,
           p.language_code::text, p.created_at,
           u.email::text, u.last_sign_in_at, u.email_confirmed_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles for select
  using (id = auth.uid() or public.is_linked_caregiver(id, true) or public.is_admin());

create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid());

-- Lets the admin panel edit any user's profile (name, user_type,
-- is_active, etc). Separate from profiles_update_own above rather than
-- folded into it, so the "own row" and "admin" grants stay easy to reason
-- about / revoke independently.
create policy "profiles_update_admin" on public.profiles for update
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- medications
-- ---------------------------------------------------------------------------
create policy "medications_select_own_or_caregiver" on public.medications for select
  using (user_id = auth.uid() or public.is_linked_caregiver(user_id) or public.is_admin());

create policy "medications_insert_own" on public.medications for insert
  with check (user_id = auth.uid());

create policy "medications_update_own" on public.medications for update
  using (user_id = auth.uid());

create policy "medications_delete_own" on public.medications for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- dose_logs
-- ---------------------------------------------------------------------------
create policy "dose_logs_select_own_or_caregiver" on public.dose_logs for select
  using (user_id = auth.uid() or public.is_linked_caregiver(user_id) or public.is_admin());

create policy "dose_logs_insert_own" on public.dose_logs for insert
  with check (user_id = auth.uid());

create policy "dose_logs_update_own" on public.dose_logs for update
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- interactions — the validated reference dataset. Readable by any
-- authenticated user (needed for the Edge Function's query context; the
-- function itself runs with the service role anyway) but only admins with
-- the pharmacist_reviewer/superadmin role may modify it — never end users,
-- never the AI.
-- ---------------------------------------------------------------------------
create policy "interactions_select_authenticated" on public.interactions for select
  using (auth.role() = 'authenticated');

create policy "interactions_write_admin_only" on public.interactions for all
  using (
    exists (select 1 from public.admin_users
            where user_id = auth.uid() and role in ('pharmacist_reviewer','superadmin'))
  );

-- ---------------------------------------------------------------------------
-- interaction_results
-- ---------------------------------------------------------------------------
create policy "interaction_results_select_own_or_caregiver" on public.interaction_results for select
  using (user_id = auth.uid() or public.is_linked_caregiver(user_id) or public.is_admin());

-- Inserts/updates to interaction_results happen only via the
-- check-interactions / ai-explain Edge Functions, which use the Supabase
-- service_role key and therefore bypass RLS entirely — no end-user policy
-- grants insert/update here by design.

-- Deleting a logged safety-check result (e.g. a false positive, or a
-- user request to clear something from the admin dashboard) is
-- superadmin-only — one tier above the pharmacist_reviewer bar on
-- interactions/drugs, since this touches a specific person's health
-- history rather than the shared reference catalog.
create policy "interaction_results_delete_superadmin" on public.interaction_results for delete
  using (
    exists (select 1 from public.admin_users
            where user_id = auth.uid() and role = 'superadmin')
  );

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
create policy "chat_messages_select_own" on public.chat_messages for select
  using (user_id = auth.uid() or public.is_admin());

create policy "chat_messages_insert_own" on public.chat_messages for insert
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- care_circle_links
-- ---------------------------------------------------------------------------
create policy "care_circle_select_participant" on public.care_circle_links for select
  using (owner_user_id = auth.uid() or caregiver_user_id = auth.uid() or public.is_admin());

create policy "care_circle_insert_owner" on public.care_circle_links for insert
  with check (owner_user_id = auth.uid());

create policy "care_circle_update_owner" on public.care_circle_links for update
  using (owner_user_id = auth.uid());

-- Lets the invited person accept/decline (flip status) their own pending
-- invite, and later revoke themselves from an owner's circle if they want
-- out — separate from care_circle_update_owner so each side's grant is
-- easy to reason about independently.
create policy "care_circle_update_caregiver" on public.care_circle_links for update
  using (caregiver_user_id = auth.uid());

-- pending_care_circle_invites — the invited person's own pending invites,
-- with the owner's display name attached. A plain client-side join to
-- profiles won't work here: profiles_select_own only opens up once the
-- link is 'linked', which is exactly the state that hasn't happened yet.
-- Security-definer, but inherently self-scoped by auth.uid() — no
-- is_admin() gate needed, since it can only ever return the caller's own
-- pending invites.
create function public.pending_care_circle_invites()
returns table (
  id uuid,
  owner_user_id uuid,
  owner_name text,
  relation text,
  can_view_schedule boolean,
  can_view_missed_dose_alerts boolean,
  can_view_health_profile boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select l.id, l.owner_user_id, p.full_name, l.relation, l.can_view_schedule,
           l.can_view_missed_dose_alerts, l.can_view_health_profile, l.created_at
    from public.care_circle_links l
    join public.profiles p on p.id = l.owner_user_id
    where l.caregiver_user_id = auth.uid() and l.status = 'pending'
    order by l.created_at desc;
end;
$$;

-- linked_owner_names — display names for the people a caregiver is
-- currently linked to (and permitted to view the schedule of), used to
-- label "[Name]'s Medications" sections. Deliberately narrower than
-- reading the owner's full profiles row: a schedule-only caregiver gets
-- just the name, not allergies/conditions/etc., which stays gated behind
-- can_view_health_profile via is_linked_caregiver() elsewhere.
create function public.linked_owner_names()
returns table (owner_user_id uuid, full_name text)
language sql stable security definer
set search_path = public
as $$
  select l.owner_user_id, p.full_name
  from public.care_circle_links l
  join public.profiles p on p.id = l.owner_user_id
  where l.caregiver_user_id = auth.uid() and l.status = 'linked' and l.can_view_schedule;
$$;

-- ---------------------------------------------------------------------------
-- audit_log — insert-only from Edge Functions (service role); readable by
-- admins and by the user about their own data being accessed.
-- ---------------------------------------------------------------------------
create policy "audit_log_select_admin_or_target" on public.audit_log for select
  using (public.is_admin() or actor_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- admin_users — only readable by other admins; never client-writable.
-- ---------------------------------------------------------------------------
create policy "admin_users_select_admin" on public.admin_users for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_log — allow admins to write their own action entries directly
-- (the admin panel inserts a row after each edit). Regular Edge Function
-- writes still use the service-role key and bypass RLS entirely.
-- ---------------------------------------------------------------------------
create policy "audit_log_insert_admin" on public.audit_log for insert
  with check (public.is_admin() and actor_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- drugs — the trade-name catalog. Readable by any authenticated user (the
-- add-medicine search screen needs it); writable only by admins with the
-- pharmacist_reviewer/superadmin role, same bar as `interactions`.
-- ---------------------------------------------------------------------------
create policy "drugs_select_authenticated" on public.drugs for select
  using (auth.role() = 'authenticated');

create policy "drugs_write_admin_only" on public.drugs for all
  using (
    exists (select 1 from public.admin_users
            where user_id = auth.uid() and role in ('pharmacist_reviewer','superadmin'))
  );

-- ---------------------------------------------------------------------------
-- legal_documents — Terms & Conditions / Privacy Policy content. Readable
-- by any authenticated user; writable only by superadmin, since this is
-- legal/liability content rather than clinical data.
-- ---------------------------------------------------------------------------
create policy "legal_documents_select_authenticated" on public.legal_documents for select
  using (auth.role() = 'authenticated');

create policy "legal_documents_write_superadmin" on public.legal_documents for all
  using (
    exists (select 1 from public.admin_users
            where user_id = auth.uid() and role = 'superadmin')
  );

-- ---------------------------------------------------------------------------
-- data_versions — readable by any authenticated user (the admin panel's
-- "current data version" header); never written to directly by client
-- code — see bump_data_version() below, called instead of an insert/update
-- policy so the increment stays atomic under concurrent admins.
-- ---------------------------------------------------------------------------
create policy "data_versions_select_authenticated" on public.data_versions for select
  using (auth.role() = 'authenticated');

-- bump_data_version — atomically increments the version counter for
-- 'drugs' or 'interactions' and records who/when/why. Called after every
-- admin-panel write to that table (manual add/edit/delete, or a bulk
-- upload) so the displayed version always reflects the live data, not
-- just the original spreadsheet import.
create function public.bump_data_version(p_table_name text, p_source text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_version int;
begin
  if not exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('pharmacist_reviewer', 'superadmin')
  ) then
    raise exception 'not authorized';
  end if;
  if p_table_name not in ('drugs', 'interactions') then
    raise exception 'invalid table_name';
  end if;

  insert into public.data_versions (table_name, version, updated_at, updated_by, source)
  values (p_table_name, 1, now(), auth.uid(), p_source)
  on conflict (table_name) do update
    set version = public.data_versions.version + 1,
        updated_at = now(),
        updated_by = auth.uid(),
        source = excluded.source
  returning version into new_version;

  return new_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- webauthn_credentials — a user can see and revoke their own registered
-- biometric devices, but never insert/update one directly: the public key
-- and signature counter are only ever written by the webauthn-register-
-- verify / webauthn-login-verify Edge Functions (service role), after
-- they've actually verified the cryptographic attestation/assertion.
-- ---------------------------------------------------------------------------
create policy "webauthn_credentials_select_own" on public.webauthn_credentials for select
  using (user_id = auth.uid());

create policy "webauthn_credentials_delete_own" on public.webauthn_credentials for delete
  using (user_id = auth.uid());

-- webauthn_challenges is never touched by client code — no policies grant
-- access to the authenticated/anon roles, only the service-role key used
-- inside the webauthn-* Edge Functions bypasses RLS entirely.
