// WASFATI — check-interactions Edge Function
//
// This function IS the "interaction engine" referenced throughout the WDS
// and PRD: it is the sole authority on medical risk (Design Principle #9 /
// Project Rule #3). It queries the validated `public.interactions` table
// directly with SQL — it does not call an LLM, and it must never be
// modified to let an AI model infer or invent a severity.
//
// Two entry points, same engine:
//   1. { medication_ids: [...] } — checks the caller's own SAVED medications
//      and persists every hit to interaction_results (the normal add-a-
//      medicine flow).
//   2. { trade_names: [...] } — the "Quick Interaction Check" flow: checks
//      ad-hoc trade names (resolved via the drugs catalog) against EACH
//      OTHER only — never against the caller's saved medications, since it
//      is a temporary heads-up on a new prescription — and never writes
//      anything: no medications row, no interaction_results row. Same
//      matching logic, same interactions table, deliberately no second
//      implementation of the algorithm.
//
// Deploy: supabase functions deploy check-interactions
// Invoke (from the client): supabase.functions.invoke('check-interactions', { body: { medication_ids: [...] } })

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // set via `supabase secrets set`

// Browsers preflight cross-origin POSTs (the Next.js app calls this from a
// different origin than *.supabase.co) — without these headers the actual
// request never leaves the browser, even though a server-to-server call
// (curl, another Edge Function) works fine.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Admin = ReturnType<typeof createClient>;

type IngredientEntry = {
  id: string; // stable key for dedup — a medication id, or the queue index for ad-hoc names
  name: string; // display label
  ingredients: string[];
  isQueue: boolean; // false for the caller's existing saved medications
};

type Hit = {
  severity: unknown;
  summary: unknown;
  patient_summary: unknown;
  interaction_id?: unknown;
  names: string[];
  // The ingredient pair (or shared ingredient) that produced this hit, e.g.
  // "ibuprofen + irbesartan". After mergeHitsByProductPair it lists every
  // pair behind the severity that is reported for the product pair.
  ingredients?: string[];
};

const SEVERITY_RANK: Record<string, number> = { high: 3, moderate: 2, low: 1, unverified: 0 };
const severityRank = (s: unknown) => SEVERITY_RANK[String(s)] ?? 0;

/** Rules are authored (and stored) per ingredient pair, so two products with
 * several ingredients each can produce several hits — one per matching
 * ingredient pair — and each rule's a/b order is fixed alphabetically, so the
 * same two products can appear in either order. The reader thinks in
 * products, so collapse to ONE result per product pair:
 *   - the worst severity wins;
 *   - "unverified" (no rule matched that ingredient pair) is dropped when
 *     another ingredient pair of the same products has a real rule, since it
 *     says nothing the real rule doesn't already cover;
 *   - ties break deterministically (ingredient-pair label) so re-checking the
 *     same products always yields the same rule/interaction_id. */
function mergeHitsByProductPair(hits: Hit[]): Hit[] {
  const groups = new Map<string, Hit[]>();
  for (const hit of hits) {
    const key = [...hit.names].sort().join("|");
    const group = groups.get(key);
    if (group) group.push(hit);
    else groups.set(key, [hit]);
  }

  const label = (h: Hit) => h.ingredients?.[0] ?? "";
  const merged: Hit[] = [];
  for (const group of groups.values()) {
    const ruleBased = group.filter((h) => severityRank(h.severity) > 0);
    const candidates = ruleBased.length > 0 ? ruleBased : group;
    candidates.sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity) || label(a).localeCompare(label(b)),
    );
    const top = candidates[0];
    const topRank = severityRank(top.severity);
    const ingredients = [
      ...new Set(candidates.filter((h) => severityRank(h.severity) === topRank).map(label).filter(Boolean)),
    ];
    merged.push({ ...top, ingredients });
  }
  return merged;
}

// A medication's generic_name may itself be a compound formulation, e.g.
// "quinapril+hydrochlorothiazide" — interaction rules are authored at the
// individual-ingredient level, so a rule for "hydrochlorothiazide" alone
// must still catch a combination product containing it. Every match is
// done at the ingredient level, never the raw compound string.
function splitIngredients(genericName: string): string[] {
  return genericName
    .split("+")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const body = await req.json();

    // Service-role client: bypasses RLS deliberately, because this function
    // is the trusted server-side authority — but it re-derives the calling
    // user from their JWT below so results are still scoped correctly.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    if (Array.isArray(body.trade_names)) {
      return await handleEphemeralCheck(admin, userId, body.trade_names);
    }
    return await handleSavedMedicationsCheck(admin, userId, body.medication_ids);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Entry point 1 — the caller's own saved medications. Persists every hit.
// ---------------------------------------------------------------------------
async function handleSavedMedicationsCheck(admin: Admin, userId: string, medicationIds: unknown) {
  if (!Array.isArray(medicationIds) || medicationIds.length < 1) {
    return json({ error: "medication_ids must be a non-empty array" }, 400);
  }

  const { data: requestedMeds, error: medsErr } = await admin
    .from("medications")
    .select("id, generic_name")
    .in("id", medicationIds)
    .eq("user_id", userId);
  if (medsErr) return json({ error: medsErr.message }, 500);
  if (!requestedMeds || requestedMeds.length === 0) return json([], 200);

  // Only the medications actually being (re)checked are "queue" entries —
  // the rest of the caller's active list is included as context (so a new
  // medicine still gets checked against everything already on the list)
  // but not re-evaluated against itself. Without this, adding any single
  // medicine re-flags EVERY pair in the whole list, which floods the log
  // with fresh rows for pairs that haven't changed at all.
  const requestedIds = new Set(requestedMeds.map((m) => m.id));
  const { data: allActiveMeds } = await admin
    .from("medications")
    .select("id, generic_name")
    .eq("user_id", userId)
    .eq("archived", false);
  const otherMeds = (allActiveMeds ?? []).filter((m) => !requestedIds.has(m.id));

  const profile = await loadProfileFlags(admin, userId);
  const entries: IngredientEntry[] = [
    ...requestedMeds.map((m) => ({
      id: m.id,
      name: m.generic_name,
      ingredients: splitIngredients(m.generic_name),
      isQueue: true,
    })),
    ...otherMeds.map((m) => ({
      id: m.id,
      name: m.generic_name,
      ingredients: splitIngredients(m.generic_name),
      isQueue: false,
    })),
  ];

  const hits = await findInteractionHits(admin, entries, profile);

  // Don't insert a fresh duplicate of an alert that's already sitting in
  // the log for this exact pair — otherwise re-checking (e.g. rechecking
  // the whole list from the history page) keeps resurrecting an alert an
  // admin already cleared, even though nothing about the pair changed.
  // Still surface it to the user in this add flow either way — just point
  // at the existing row instead of minting a new one.
  const { data: existingResults } = await admin
    .from("interaction_results")
    .select("id, medication_names, interaction_id")
    .eq("user_id", userId);
  const existingByKey = new Map(
    (existingResults ?? []).map((r) => [
      [...r.medication_names].sort().join("|") + `|${r.interaction_id}`,
      r.id as string,
    ]),
  );

  // One result per product pair (see mergeHitsByProductPair) — `ingredients`
  // rides along on the response only; it isn't a column on interaction_results.
  const results: unknown[] = [];
  for (const hit of mergeHitsByProductPair(hits)) {
    const key = [...hit.names].sort().join("|") + `|${hit.interaction_id}`;

    const existingId = existingByKey.get(key);
    if (existingId) {
      results.push({
        id: existingId,
        user_id: userId,
        medication_names: hit.names,
        interaction_id: hit.interaction_id ?? null,
        severity: hit.severity,
        summary: hit.summary,
        patient_summary: hit.patient_summary,
        ai_explanation: null,
        checked_at: new Date().toISOString(),
        ingredients: hit.ingredients ?? [],
      });
    } else {
      const row = await persistResult(admin, userId, hit.names, hit);
      results.push({ ...row, ingredients: hit.ingredients ?? [] });
    }
  }
  return json(results, 200);
}

// ---------------------------------------------------------------------------
// Entry point 2 — Quick Interaction Check. Resolves each trade name via the
// drugs catalog, checks the queued medicines against each other (NOT against
// the caller's saved medications), and returns the result WITHOUT saving
// anything.
// ---------------------------------------------------------------------------
async function handleEphemeralCheck(admin: Admin, userId: string, tradeNamesInput: unknown) {
  const tradeNames = (Array.isArray(tradeNamesInput) ? tradeNamesInput : [])
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    .map((n) => n.trim());
  if (tradeNames.length === 0) {
    return json({ error: "trade_names must be a non-empty array" }, 400);
  }

  const queueEntries: IngredientEntry[] = [];
  const unresolved: string[] = [];

  for (let i = 0; i < tradeNames.length; i++) {
    const input = tradeNames[i];
    const drug = await resolveDrug(admin, input);
    if (!drug) {
      unresolved.push(input);
      continue;
    }
    queueEntries.push({
      id: `queue-${i}`,
      name: drug.trade_name,
      ingredients: splitIngredients(drug.generic_name),
      isQueue: true,
    });
  }

  // Deliberately NOT compared with the caller's saved medications: a quick
  // check is a temporary "heads-up on this new prescription" (e.g. before
  // leaving the clinic), so only the queued medicines are checked against
  // each other. The caller's own profile flags (pregnancy, elderly, ...)
  // still apply — those describe the person, not their medication list.
  const profile = await loadProfileFlags(admin, userId);
  const hits = await findInteractionHits(admin, queueEntries, profile);

  const pairs = mergeHitsByProductPair(hits).map((hit) => ({
    severity: hit.severity,
    summary: hit.summary,
    patient_summary: hit.patient_summary,
    names: hit.names,
    ingredients: hit.ingredients ?? [],
  }));

  return json({ pairs, unresolved }, 200);
}

/** Best-effort trade-name -> catalog row lookup: exact (case-insensitive)
 * match first, falling back to a "contains" match so a slightly-off OCR
 * read (extra dose text, a trailing word) still has a chance to resolve. */
async function resolveDrug(admin: Admin, tradeName: string) {
  const { data: exact } = await admin
    .from("drugs")
    .select("trade_name, generic_name")
    .ilike("trade_name", tradeName)
    .limit(1);
  if (exact && exact.length > 0) return exact[0];

  const { data: contains } = await admin
    .from("drugs")
    .select("trade_name, generic_name")
    .ilike("trade_name", `%${tradeName}%`)
    .limit(1);
  return contains && contains.length > 0 ? contains[0] : null;
}

async function loadProfileFlags(admin: Admin, userId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("age, is_pregnant, is_breastfeeding")
    .eq("id", userId)
    .single();
  return profile;
}

/** Runs both the pairwise drug-drug pass and the single-substance
 * profile-flag pass over a set of ingredient entries, returning every hit
 * found. At least one side of a pairwise hit must be a "queue" entry
 * (isQueue: true) — two non-queue entries are skipped, since for the saved-
 * medications flow every entry is queue:true (a fresh full check), while
 * for the ephemeral flow the caller's existing medications are already a
 * known-safe pair with each other and don't need re-checking. */
async function findInteractionHits(
  admin: Admin,
  entries: IngredientEntry[],
  profile: { age: number | null; is_pregnant: boolean | null; is_breastfeeding: boolean | null } | null,
): Promise<Hit[]> {
  const hits: Hit[] = [];
  const allIngredients = [...new Set(entries.flatMap((e) => e.ingredients))];
  if (allIngredients.length === 0) return hits;

  // 1. Pairwise drug-drug checks, at the ingredient level.
  const [{ data: byA }, { data: byB }] = await Promise.all([
    admin.from("interactions").select("*").not("substance_b", "is", null).in("substance_a", allIngredients),
    admin.from("interactions").select("*").not("substance_b", "is", null).in("substance_b", allIngredients),
  ]);
  const candidatesById = new Map<string, Record<string, unknown>>();
  for (const hit of [...(byA ?? []), ...(byB ?? [])]) {
    candidatesById.set(hit.id as string, hit);
  }

  for (const hit of candidatesById.values()) {
    const subA = hit.substance_a as string;
    const subB = hit.substance_b as string;
    const entriesWithA = entries.filter((e) => e.ingredients.includes(subA));
    const entriesWithB = entries.filter((e) => e.ingredients.includes(subB));

    for (const a of entriesWithA) {
      for (const b of entriesWithB) {
        if (a.id === b.id) continue; // don't flag a combo product's own ingredients against each other
        if (!a.isQueue && !b.isQueue) continue; // both already-known — nothing new to report
        hits.push({
          severity: hit.severity,
          summary: hit.summary,
          patient_summary: hit.patient_summary ?? null,
          interaction_id: hit.id,
          names: [a.name, b.name],
          ingredients: [`${subA} + ${subB}`],
        });
      }
    }
  }

  // 2. Duplicate therapy — two different products sharing an active
  //    ingredient (e.g. two different acetaminophen brands) is a common,
  //    dangerous real-world mistake that isn't a specific named-pair rule
  //    in the interactions table, so it's computed directly rather than
  //    looked up. Always high severity — this is a structural risk, not a
  //    graded one.
  hits.push(...findDuplicateTherapyHits(entries));

  // 3. Single-substance checks against profile flags (pregnancy, elderly,
  //    etc), only for queue entries — a non-queue (already-saved) entry was
  //    already checked against these when it was originally added.
  const conditions: string[] = [];
  if (profile?.is_pregnant) conditions.push("pregnancy");
  if (profile?.is_breastfeeding) conditions.push("breastfeeding");
  if ((profile?.age ?? 0) >= 65) conditions.push("elderly");

  if (conditions.length > 0) {
    const { data: profileHits } = await admin
      .from("interactions")
      .select("*")
      .is("substance_b", null)
      .in("substance_a", allIngredients)
      .in("interaction_type", conditions);
    for (const hit of profileHits ?? []) {
      const entriesWithIt = entries.filter((e) => e.isQueue && e.ingredients.includes(hit.substance_a as string));
      for (const entry of entriesWithIt) {
        hits.push({
          severity: hit.severity,
          summary: hit.summary,
          patient_summary: hit.patient_summary ?? null,
          interaction_id: hit.id,
          names: [entry.name],
        });
      }
    }
  }

  return hits;
}

/** Two different entries sharing at least one active ingredient — same
 * generic composition, whether the two names match exactly (e.g. two
 * "aspirin" entries) or only partially overlap (e.g. a combo product
 * containing acetaminophen alongside a separate acetaminophen product).
 * This needs no interactions-table row: it's a structural duplicate-
 * therapy risk, not a specific named-pair rule, so it's synthesized
 * in-code and always reported as high severity. */
function findDuplicateTherapyHits(entries: IngredientEntry[]): Hit[] {
  const hits: Hit[] = [];
  const seenPairs = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (!a.isQueue && !b.isQueue) continue; // both already-known — nothing new to report
      const shared = a.ingredients.find((ing) => b.ingredients.includes(ing));
      if (!shared) continue;
      const pairKey = [a.id, b.id].sort().join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      hits.push({
        severity: "high",
        summary: `Duplicate therapy — ${a.name} and ${b.name} both contain ${shared}. Taking both increases the risk of an accidental overdose; do not continue both without your doctor's or pharmacist's advice.`,
        patient_summary:
          "You're taking two medicines with the same active ingredient. This can lead to an accidental overdose — talk to your doctor or pharmacist before continuing both.",
        interaction_id: null,
        names: [a.name, b.name],
        ingredients: [shared],
      });
    }
  }
  return hits;
}

async function persistResult(admin: Admin, userId: string, medicationNames: string[], hit: Hit) {
  const { data, error } = await admin
    .from("interaction_results")
    .insert({
      user_id: userId,
      medication_names: medicationNames,
      interaction_id: hit.interaction_id,
      severity: hit.severity,
      summary: hit.summary,
      patient_summary: hit.patient_summary,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
