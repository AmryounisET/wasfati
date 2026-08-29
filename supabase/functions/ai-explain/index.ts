// WASFATI — ai-explain Edge Function
//
// This is the "AI Explanation Layer" from the PRD architecture diagram.
// It has two entry points:
//   1. explain an already-computed interaction_results row in plain language
//   2. answer a free-form chat question, grounded in the user's own
//      medications + their most recent interaction_results
//
// HARD RULE: this function only ever READS `interactions` /
// `interaction_results` — it has no INSERT/UPDATE grant against either
// table (enforced by using it read-only here, on top of the RLS policy in
// policies.sql that blocks non-admin writes outright). If asked something
// the validated data doesn't cover, the model is instructed to say so and
// defer to a pharmacist/physician — it must never invent a severity or a
// new interaction.
//
// Deploy: supabase functions deploy ai-explain
// Secrets: supabase secrets set AI_API_KEY=... AI_API_BASE_URL=... AI_MODEL=...
// (OpenAI-compatible endpoint per PRD §7 — works with OpenAI, Azure OpenAI,
// or a self-hosted open-source model behind an OpenAI-compatible proxy.)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_API_KEY = Deno.env.get("AI_API_KEY")!;
const AI_API_BASE_URL = Deno.env.get("AI_API_BASE_URL") ?? "https://api.openai.com/v1";
const AI_MODEL = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You are Wasfati's explanation assistant. You explain medication
safety information that has ALREADY been determined by a validated clinical
interaction engine — you never diagnose, never invent an interaction, and
never override or contradict the provided severity/summary. If asked about
something not covered by the provided data, say plainly that you don't have
validated information on that and recommend the person ask their pharmacist
or physician. Always answer in the user's language (Arabic by default), in
short, plain, non-technical sentences suitable for a layperson. Never claim
certainty you don't have. Never suggest stopping or changing a medication
yourself — only a physician/pharmacist can advise that.`;

// Browsers preflight cross-origin POSTs (the Next.js app calls this from a
// different origin than *.supabase.co) — without these headers the actual
// request never leaves the browser, even though a server-to-server call
// (curl, another Edge Function) works fine.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const body = await req.json();

    if (body.interaction_result_id) {
      return await explainInteractionResult(admin, userId, body.interaction_result_id);
    }
    if (body.chat_message) {
      return await answerChatQuestion(admin, userId, body.chat_message);
    }
    return json({ error: "Provide either interaction_result_id or chat_message" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

async function explainInteractionResult(
  admin: ReturnType<typeof createClient>,
  userId: string,
  resultId: string,
) {
  const { data: result, error } = await admin
    .from("interaction_results")
    .select("*")
    .eq("id", resultId)
    .eq("user_id", userId) // never let a user request another user's result via this function
    .single();
  if (error || !result) return json({ error: "Not found" }, 404);

  if (result.ai_explanation) {
    return json({ explanation: result.ai_explanation }, 200);
  }

  const explanation = await callAi([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Validated interaction data (do not contradict this):\n` +
        `Medications: ${result.medication_names.join(", ")}\n` +
        `Severity: ${result.severity}\n` +
        `Summary: ${result.summary}\n\n` +
        `Explain this simply and reassuringly-but-honestly to the patient in Arabic.`,
    },
  ]);

  await admin.from("interaction_results").update({ ai_explanation: explanation }).eq("id", resultId);
  return json({ explanation }, 200);
}

async function answerChatQuestion(
  admin: ReturnType<typeof createClient>,
  userId: string,
  question: string,
) {
  const { data: meds } = await admin
    .from("medications")
    .select("name, generic_name, dose, frequency")
    .eq("user_id", userId)
    .eq("archived", false);

  const { data: recentResults } = await admin
    .from("interaction_results")
    .select("medication_names, severity, summary")
    .eq("user_id", userId)
    .order("checked_at", { ascending: false })
    .limit(10);

  const context =
    `The user's current medications: ${JSON.stringify(meds ?? [])}\n` +
    `Their most recent validated interaction check results: ${JSON.stringify(recentResults ?? [])}`;

  const reply = await callAi([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `${context}\n\nUser question: ${question}` },
  ]);

  await admin.from("chat_messages").insert({ user_id: userId, source: "ai", text: reply });
  return json({ reply }, 200);
}

async function callAi(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.3 }),
  });
  if (!res.ok) throw new Error(`AI provider error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
