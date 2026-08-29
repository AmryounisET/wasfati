// WASFATI — check-interactions Edge Function
//
// This function IS the "interaction engine" referenced throughout the WDS
// and PRD: it is the sole authority on medical risk (Design Principle #9 /
// Project Rule #3). It queries the validated `public.interactions` table
// directly with SQL — it does not call an LLM, and it must never be
// modified to let an AI model infer or invent a severity.
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

    const { medication_ids } = await req.json();
    if (!Array.isArray(medication_ids) || medication_ids.length < 1) {
      return json({ error: "medication_ids must be a non-empty array" }, 400);
    }

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

    // 1. Load the requested medications (must belong to this user).
    const { data: meds, error: medsErr } = await admin
      .from("medications")
      .select("id, generic_name")
      .in("id", medication_ids)
      .eq("user_id", userId);
    if (medsErr) return json({ error: medsErr.message }, 500);
    if (!meds || meds.length === 0) return json([], 200);

    // Also pull the user's profile for single-substance checks
    // (pregnancy/breastfeeding/elderly) — age/flags, never AI-derived.
    const { data: profile } = await admin
      .from("profiles")
      .select("age, is_pregnant, is_breastfeeding")
      .eq("id", userId)
      .single();

    const results: unknown[] = [];
    const persistedKeys = new Set<string>(); // dedupe (medication pair + rule) across ingredient matches

    // 2. Pairwise drug-drug checks, at the ingredient level. Each medication
    //    resolves to one or more ingredients (>1 only for a combination
    //    product); every ingredient of every medication is checked against
    //    every ingredient of every OTHER medication.
    const medIngredients = meds.map((m) => ({
      id: m.id,
      name: m.generic_name,
      ingredients: splitIngredients(m.generic_name),
    }));
    const allIngredients = [...new Set(medIngredients.flatMap((m) => m.ingredients))];

    if (allIngredients.length > 0) {
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
        const medsWithA = medIngredients.filter((m) => m.ingredients.includes(subA));
        const medsWithB = medIngredients.filter((m) => m.ingredients.includes(subB));

        for (const medA of medsWithA) {
          for (const medB of medsWithB) {
            if (medA.id === medB.id) continue; // don't flag a combo product's own ingredients against each other
            const pairKey = [medA.id, medB.id].sort().join("|") + `|${hit.id}`;
            if (persistedKeys.has(pairKey)) continue;
            persistedKeys.add(pairKey);
            results.push(await persistResult(admin, userId, [medA.name, medB.name], hit));
          }
        }
      }
    }

    // 3. Single-substance checks against profile flags (pregnancy, elderly, etc),
    //    also at the ingredient level.
    const conditions: string[] = [];
    if (profile?.is_pregnant) conditions.push("pregnancy");
    if (profile?.is_breastfeeding) conditions.push("breastfeeding");
    if ((profile?.age ?? 0) >= 65) conditions.push("elderly");

    if (conditions.length > 0 && allIngredients.length > 0) {
      const { data: hits } = await admin
        .from("interactions")
        .select("*")
        .is("substance_b", null)
        .in("substance_a", allIngredients)
        .in("interaction_type", conditions);
      for (const hit of hits ?? []) {
        const medsWithIt = medIngredients.filter((m) => m.ingredients.includes(hit.substance_a as string));
        for (const med of medsWithIt) {
          results.push(await persistResult(admin, userId, [med.name], hit));
        }
      }
    }

    return json(results, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

async function persistResult(
  admin: ReturnType<typeof createClient>,
  userId: string,
  medicationNames: string[],
  hit: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from("interaction_results")
    .insert({
      user_id: userId,
      medication_names: medicationNames,
      interaction_id: hit.id,
      severity: hit.severity,
      summary: hit.summary,
      patient_summary: hit.patient_summary ?? null,
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
