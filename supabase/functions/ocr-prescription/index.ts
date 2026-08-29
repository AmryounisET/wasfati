// WASFATI — ocr-prescription Edge Function
//
// Reads a photographed/scanned prescription image and extracts a
// best-effort list of medications (name, dose, frequency) as structured
// data. This is purely an input-assistance step — it never writes to the
// database and never runs an interaction check itself. The client always
// routes the result through the existing manual-entry form for the user to
// review/correct before anything is saved, exactly like the drug-search
// flow already does. The AI here only ever reads a picture and proposes
// text; it has no say in medical safety (that stays check-interactions'
// job, per Project Rule #3).
//
// Deploy: supabase functions deploy ocr-prescription
// Uses the same AI_API_KEY / AI_API_BASE_URL / AI_MODEL secrets as
// ai-explain — the configured model must support image input (e.g.
// gpt-4o-mini and gpt-4o both do) or every request will fail closed.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_API_KEY = Deno.env.get("AI_API_KEY")!;
const AI_API_BASE_URL = Deno.env.get("AI_API_BASE_URL") ?? "https://api.openai.com/v1";
const AI_MODEL = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You read a photo or scan of a medication prescription (or a pharmacy
medicine box/label) and extract ONLY what is visibly printed on it. You never
guess a medicine that isn't legible, never infer a dose that isn't shown, and
never provide medical advice. If the image isn't a prescription/medicine
label, or nothing is legible, return an empty list.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching
exactly this shape:
{"medications":[{"name":string,"generic_name":string|null,"dose":string|null,"frequency_hint":string|null}]}

- "name": the brand/trade name as printed.
- "generic_name": the active ingredient if printed or you are highly
  confident of it for that exact brand; otherwise null.
- "dose": the strength as printed, e.g. "500mg" (keep unit attached, no
  spaces); null if not legible.
- "frequency_hint": a short plain-language note of how often, ONLY if
  explicitly printed (e.g. "twice daily", "before sleep"); otherwise null.
  Never invent a schedule that isn't written down.`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ExtractedMedication = {
  name: string;
  generic_name: string | null;
  dose: string | null;
  frequency_hint: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const { image } = await req.json();
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return json({ error: "image must be a data:image/... base64 URL" }, 400);
    }

    const res = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the medications from this image." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("AI provider error", res.status, await res.text());
      return json({ error: "OCR service unavailable" }, 502);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const medications = parseMedications(raw);

    return json({ medications }, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

function parseMedications(raw: string): ExtractedMedication[] {
  // Some models wrap JSON in ```json fences despite instructions not to —
  // strip that before parsing rather than failing the whole request on it.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    const list = Array.isArray(parsed?.medications) ? parsed.medications : [];
    return list
      .filter((m: unknown): m is Record<string, unknown> => !!m && typeof m === "object")
      .map((m: Record<string, unknown>) => ({
        name: typeof m.name === "string" ? m.name.trim() : "",
        generic_name: typeof m.generic_name === "string" ? m.generic_name.trim() : null,
        dose: typeof m.dose === "string" ? m.dose.trim() : null,
        frequency_hint: typeof m.frequency_hint === "string" ? m.frequency_hint.trim() : null,
      }))
      .filter((m: ExtractedMedication) => m.name.length > 0);
  } catch {
    return [];
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
