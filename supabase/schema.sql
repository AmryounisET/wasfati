-- =============================================================================
-- WASFATI — Supabase schema v1.0
-- Run in the Supabase SQL editor, or via `supabase db push` with the CLI.
-- Depends on: pgcrypto (for gen_random_uuid) — enabled by default on Supabase.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users. Created automatically by the trigger below
-- whenever a new user signs up via Supabase Auth.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  -- Drives how much clinical detail interaction results show (see
  -- interactions.patient_summary below): patients get a brief, plain-
  -- language alert; students/providers get the full scientific wording.
  -- This is a UI-detail-level setting only — it never changes what the
  -- interaction engine computes, only how the result is worded.
  user_type text not null default 'patient' check (user_type in ('patient','student','provider')),
  phone_number text,
  sex text check (sex in ('male', 'female')),
  age int check (age between 0 and 130),
  blood_type text,
  allergies text[] not null default '{}',
  chronic_conditions text[] not null default '{}',
  senior_friendly_mode boolean not null default false,
  language_code text not null default 'ar' check (language_code in ('ar','en','fr','it','es','tr','ru','zh')),
  is_pregnant boolean,
  is_breastfeeding boolean,
  -- In-app deactivation flag the admin panel sets — NOT a real auth ban.
  -- A true account suspension (blocking login outright) requires the
  -- Supabase Admin API with the service-role key; this flag only lets the
  -- app itself refuse a deactivated user access to app features.
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, user_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'user_type', 'patient')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- medications — a user's medication list (PRD §5, Medication List / Entry).
-- ---------------------------------------------------------------------------
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  generic_name text not null default '',
  dose text not null default '',
  frequency text not null default '',
  category text not null default 'other', -- drives icon-chip color client-side
  start_date date not null default current_date,
  notes text,
  low_stock boolean not null default false,
  archived boolean not null default false,
  source text not null default 'manual' check (source in ('manual','search','scan','prescription_ocr')),
  created_at timestamptz not null default now()
);
create index medications_user_id_idx on public.medications (user_id);

-- ---------------------------------------------------------------------------
-- dose_logs — one row per scheduled dose occurrence, confirmed_at set when
-- the patient taps "توثيق الجرعة" (Home dashboard).
-- ---------------------------------------------------------------------------
create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  scheduled_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index dose_logs_user_scheduled_idx on public.dose_logs (user_id, scheduled_at);

-- ---------------------------------------------------------------------------
-- interactions — THE VALIDATED SAFETY DATA SOURCE.
--
-- ⚠️  PRODUCTION WARNING — READ BEFORE LAUNCH ⚠️
-- This table is the one component of Wasfati that determines real medical
-- risk (Design Principle #3: "the interaction engine determines medical
-- risk, AI only explains it"). It must be populated from a licensed,
-- clinically validated source — e.g. DrugBank, First Databank (FDB)
-- MedKnowledge, Micromedex, or a national formulary's interaction API —
-- not hand-written or AI-generated data. seed_demo_data.sql ships a
-- handful of clearly-fictional/simplified rows for local development and
-- UI testing ONLY. Do not point a production environment at that seed.
-- ---------------------------------------------------------------------------
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  -- Generic/active-ingredient name, normalized lowercase. May itself be a
  -- compound string ("quinapril+hydrochlorothiazide") when the rule was
  -- authored at that granularity — the check-interactions Edge Function
  -- splits on "+" on both the rule side and the medication side so a
  -- single-ingredient rule still matches a combination product containing
  -- it (see supabase/functions/check-interactions).
  substance_a text not null,
  substance_b text, -- null for single-substance warnings (pregnancy, food, alcohol, elderly)
  interaction_type text not null check (
    interaction_type in ('drug_drug','duplicate_therapy','contraindication','food','alcohol','pregnancy','breastfeeding','elderly')
  ),
  -- 'unverified' = the source classification engine found no matching rule
  -- for this pair (NOT the same as "confirmed safe" — surfaced to users as
  -- a distinct "ask your pharmacist" state, never rendered as a green/safe
  -- banner). See supabase/seed_demo_data.sql and the DDI import script for
  -- how source data (Contraindicated/Major/Moderate/Minor/Not established)
  -- maps onto this 4-value scale.
  severity text not null check (severity in ('low','moderate','high','unverified')),
  -- Free-text pharmacological mechanism from the source classification
  -- (e.g. "Pharmacodynamic - Serotonin syndrome risk"), kept separate from
  -- the fixed interaction_type category above for admin/audit reference.
  mechanism text,
  -- How the severity was arrived at, from the source rule engine
  -- (specific named-pair override, drug-class rule, shared-risk-tag
  -- inference, or none) — lets admins/pharmacists prioritize review.
  confidence text check (confidence in ('high','medium','low')),
  summary text not null, -- validated-engine wording, NOT AI-generated — full scientific detail (students/providers)
  patient_summary text, -- brief plain-language version shown to patient-type users; falls back to `summary` if null
  citation text, -- reference to the licensed source record, for audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interactions_substance_a_idx on public.interactions (substance_a);
create index interactions_substance_b_idx on public.interactions (substance_b);
-- Lets the admin bulk-upload sheet be re-uploaded safely (ON CONFLICT
-- upsert) instead of duplicating rows on every re-import.
create unique index interactions_unique_pair_idx
  on public.interactions (substance_a, coalesce(substance_b, ''), interaction_type);

-- ---------------------------------------------------------------------------
-- drugs — the trade-name catalog that powers the "search medicine
-- database" add-medicine flow. Patients search and add medicines by trade
-- name (what's printed on the box); generic_name is what the interaction
-- engine actually matches on and is resolved automatically once a patient
-- picks a trade name. Populated by the admin panel's spreadsheet upload,
-- same licensed-source requirement as `interactions`.
-- ---------------------------------------------------------------------------
create table public.drugs (
  id uuid primary key default gen_random_uuid(),
  trade_name text not null,
  generic_name text not null, -- may be a compound "a + b + c" string, see interactions.substance_a above
  category text not null default 'other',
  common_dose text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index drugs_trade_name_idx on public.drugs (lower(trade_name));
create index drugs_generic_name_idx on public.drugs (lower(generic_name));

-- ---------------------------------------------------------------------------
-- data_versions — lets the admin panel show "what version of the catalog
-- is live" and stamp exports with it, so a downloaded CSV can be told
-- apart from whatever's currently in the database after further edits.
-- One row per tracked table; bumped via bump_data_version() (see
-- policies.sql) on every bulk upload, manual add/edit, or delete from the
-- admin panel — never written to directly by client code, to keep the
-- increment atomic under concurrent admins.
-- ---------------------------------------------------------------------------
create table public.data_versions (
  table_name text primary key check (table_name in ('drugs', 'interactions')),
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  source text -- 'initial_import' | 'bulk_upload' | 'manual_edit'
);

-- ---------------------------------------------------------------------------
-- webauthn_credentials — one row per registered biometric/passkey
-- (Face ID, Touch ID, Windows Hello, Android biometric unlock) a user has
-- enrolled. Registered as discoverable/resident credentials so login can
-- be usernameless — tap the button, pick the passkey, no typing. Written
-- only by the webauthn-* Edge Functions (service role) since the public
-- key + signature counter are security-critical; the client may only
-- read/delete its own rows (see policies.sql).
-- ---------------------------------------------------------------------------
create table public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_id text not null unique, -- base64url, as returned by the authenticator
  public_key text not null, -- base64url-encoded COSE public key
  counter bigint not null default 0, -- replay-attack guard, incremented each use
  device_type text,
  backed_up boolean not null default false,
  transports text[],
  label text, -- admin/user-facing name, e.g. "iPhone Face ID"
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index webauthn_credentials_user_idx on public.webauthn_credentials (user_id);

-- webauthn_challenges — short-lived server-generated challenges for the
-- WebAuthn ceremony (registration or login), consumed and deleted by the
-- matching -verify Edge Function. user_id is null for login challenges
-- (the whole point of usernameless auth is not knowing who's signing in
-- yet). Never read or written by client code directly.
-- ---------------------------------------------------------------------------
create table public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  challenge text not null,
  type text not null check (type in ('registration', 'authentication')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

-- ---------------------------------------------------------------------------
-- legal_documents — Terms & Conditions / Privacy Policy content, per
-- language, editable from the admin panel. The app falls back to the
-- static translated copy (src/lib/i18n) if no row exists yet for a locale.
-- ---------------------------------------------------------------------------
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('terms', 'privacy')),
  locale text not null check (locale in ('ar','en','fr','it','es','tr','ru','zh')),
  content text not null default '',
  version text not null default '1.0',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  unique (doc_type, locale)
);

-- ---------------------------------------------------------------------------
-- interaction_results — a cached/logged output of a safety check run for a
-- specific user's medication set, written by the check-interactions Edge
-- Function. ai_explanation is filled in separately by ai-explain.
-- ---------------------------------------------------------------------------
create table public.interaction_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_names text[] not null,
  interaction_id uuid references public.interactions (id),
  severity text not null check (severity in ('low','moderate','high','unverified')),
  summary text not null,
  patient_summary text, -- copied from interactions.patient_summary at check time
  ai_explanation text,
  checked_at timestamptz not null default now()
);
create index interaction_results_user_idx on public.interaction_results (user_id);

-- ---------------------------------------------------------------------------
-- chat_messages — AI Assistant conversation history.
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('user','ai','engine')),
  text text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_user_created_idx on public.chat_messages (user_id, created_at);

-- ---------------------------------------------------------------------------
-- care_circle — caregiver access grants (secondary users per PRD §4).
-- ---------------------------------------------------------------------------
create table public.care_circle_links (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade, -- the patient
  caregiver_user_id uuid references auth.users (id) on delete cascade, -- null until invite accepted
  caregiver_email text not null,
  relation text,
  can_view_schedule boolean not null default true,
  can_view_missed_dose_alerts boolean not null default true,
  can_view_health_profile boolean not null default false,
  status text not null default 'pending' check (status in ('pending','linked','revoked')),
  created_at timestamptz not null default now()
);
create index care_circle_owner_idx on public.care_circle_links (owner_user_id);
create index care_circle_caregiver_idx on public.care_circle_links (caregiver_user_id);

-- ---------------------------------------------------------------------------
-- audit_log — privacy-by-design requirement (Project Rule #4): every read
-- of another person's health data (caregiver, pharmacist, admin) is logged.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- admin_users — allow-list for the Flutter-web admin dashboard. Membership
-- here is what RLS checks to grant elevated read access (see policies.sql).
-- Insert rows manually via the Supabase SQL editor after creating the
-- corresponding auth user — never expose self-serve admin signup.
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'support' check (role in ('support','pharmacist_reviewer','superadmin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.medications enable row level security;
alter table public.dose_logs enable row level security;
alter table public.interactions enable row level security;
alter table public.interaction_results enable row level security;
alter table public.chat_messages enable row level security;
alter table public.care_circle_links enable row level security;
alter table public.audit_log enable row level security;
alter table public.admin_users enable row level security;
alter table public.drugs enable row level security;
alter table public.legal_documents enable row level security;
alter table public.data_versions enable row level security;
alter table public.webauthn_credentials enable row level security;
alter table public.webauthn_challenges enable row level security;

-- Seed the initial version rows for the DDI database import that already
-- happened via direct script (before the admin panel's version tracking
-- existed) — every write from here on goes through bump_data_version().
insert into public.data_versions (table_name, version, source) values
  ('drugs', 1, 'initial_import'),
  ('interactions', 1, 'initial_import')
on conflict (table_name) do nothing;

-- See policies.sql for the actual RLS policies — kept in a separate file
-- so schema structure and access rules can be reviewed independently.
