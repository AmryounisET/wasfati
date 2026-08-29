// WASFATI — webauthn-login-options Edge Function
//
// Step 1 of a usernameless biometric login: generates an authentication
// challenge with no allowCredentials list, so the platform authenticator
// (Face ID / Touch ID / Windows Hello / Android biometric) shows whatever
// discoverable passkeys it has for this site and lets the user pick one —
// no email/username typed first. Public — the whole point is the browser
// doesn't know who's signing in yet.
//
// Deploy: supabase functions deploy webauthn-login-options

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateAuthenticationOptions } from "https://esm.sh/@simplewebauthn/server@13";

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
    const origin = req.headers.get("Origin");
    if (!origin) return json({ error: "Missing Origin header" }, 400);
    const rpID = new URL(origin).hostname;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      // No allowCredentials -> usernameless/discoverable-credential flow.
    });

    // Opportunistic cleanup of stale challenges (login challenges have no
    // owning user to scope a delete-by-user like registration does).
    await admin.from("webauthn_challenges").delete().lt("expires_at", new Date().toISOString());

    const { error: insertChallengeError } = await admin.from("webauthn_challenges").insert({
      user_id: null,
      challenge: options.challenge,
      type: "authentication",
    });
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
