// WASFATI — webauthn-register-options Edge Function
//
// Step 1 of enrolling a biometric/passkey (Face ID, Touch ID, Windows
// Hello, Android biometric unlock) for an already-logged-in user.
// Generates a WebAuthn registration challenge, stores it, and returns the
// options for the browser's navigator.credentials.create() call. Requires
// residentKey so the resulting credential is discoverable — the login
// side can then be usernameless (tap the button, no typing).
//
// Deploy: supabase functions deploy webauthn-register-options

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateRegistrationOptions } from "https://esm.sh/@simplewebauthn/server@13";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const origin = req.headers.get("Origin");
    if (!origin) return json({ error: "Missing Origin header" }, 400);
    const rpID = new URL(origin).hostname;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
    const user = userData.user;

    const { data: existingCreds } = await admin
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    const options = await generateRegistrationOptions({
      rpName: "Wasfati",
      rpID,
      userName: user.email ?? user.id,
      userDisplayName: user.email ?? "Wasfati user",
      attestationType: "none",
      excludeCredentials: (existingCreds ?? []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? undefined) as
          | ("ble" | "hybrid" | "internal" | "nfc" | "usb")[]
          | undefined,
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });

    // Only one in-flight registration challenge per user at a time.
    await admin.from("webauthn_challenges").delete().eq("user_id", user.id).eq("type", "registration");
    const { error: insertChallengeError } = await admin
      .from("webauthn_challenges")
      .insert({ user_id: user.id, challenge: options.challenge, type: "registration" });
    if (insertChallengeError) return json({ error: insertChallengeError.message }, 500);

    return json(options, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
