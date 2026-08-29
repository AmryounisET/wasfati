# وصفتي — Wasfati

AI-powered medication safety assistant. Next.js 16 (App Router) + TypeScript +
Tailwind v4 + Supabase. See `../wasfati-handoff/HANDOFF.md` and `PRD.md` for
full product context — this file only covers what's specific to this repo.

## Status

Built in this session, not yet connected to a live Supabase project. Build
and lint are clean (`npm run build`, `npm run lint`).

**Screens implemented:** splash/loading, login + signup (email/password),
forgot password, home dashboard (dose confirmation, missed-dose + safety
banners), medication list (filters, low-stock renew), add medicine (manual
entry — fully wired; search — small local catalog stub; scan box / upload
prescription — UI-only stubs per HANDOFF.md's suggested build order), safety
result (with on-demand AI explanation), AI assistant chat, account, health
profile, care circle, display mode (senior-friendly toggle), language
(preference only, no i18n yet), privacy policy, admin dashboard
(`admin_users`-gated).

**Known gaps to flag back to whoever picks this up next:**

- No live Supabase project connected — `.env.local` has placeholder values.
  Needs `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from a
  real project, then `supabase/schema.sql` → `policies.sql` →
  `seed_demo_data.sql` applied, and both Edge Functions deployed
  (`supabase functions deploy check-interactions ai-explain`, plus
  `supabase secrets set AI_API_KEY=... AI_API_BASE_URL=... AI_MODEL=...`).
- `public.interactions` is empty/demo-only — **do not use for real patients**
  until populated from a licensed source and pharmacist-reviewed (see the
  warning in `supabase/schema.sql` and HANDOFF.md).
- The Health Profile screen in the WDS mockups includes kidney/liver
  function selectors; `profiles` has no columns for those, so they're
  omitted rather than built as fake/unsaved UI. Needs a schema decision
  before adding.
- No canonical medicine catalog table exists for the "search database" add
  flow — `add-medication/search` uses a small hardcoded list for now.
- Language switcher persists a preference but doesn't translate the UI yet
  (app is Arabic-first with hardcoded strings). Real i18n is a separate task.
- Scan box (camera/OCR) and prescription upload (PDF parsing) are UI stubs
  only, per HANDOFF.md's priority order — manual entry is the complete path.
- `dose_logs` has no scheduler/cron; "today's doses" and "missed dose" are
  derived client-side from each medication's free-text time-of-day keyword
  (`src/lib/dose-schedule.ts`). Fine for MVP, not a real scheduling engine.
- PWA icon is a placeholder generated SVG (`public/icons/icon.svg`), not the
  final brand mark — swap once real assets exist. A minimal service worker
  (`public/sw.js`) caches only the static shell (manifest + icon), never
  authenticated pages or API responses.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project's URL/anon key
npm run dev
```

## Supabase backend

`supabase/` in this repo is a copy of the handoff's backend (schema,
RLS policies, demo seed, Edge Functions) — apply with the Supabase CLI or
paste into the SQL editor:

```bash
supabase link --project-ref <your-project-ref>
supabase db push          # schema.sql + policies.sql, in that order
supabase functions deploy check-interactions
supabase functions deploy ai-explain
```

## Deploy

Target is Vercel. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables on the Vercel
project, then deploy as a standard Next.js app.
