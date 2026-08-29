// WASFATI — webauthn-login-verify Edge Function
//
// Step 2 of a usernameless biometric login: verifies the assertion
// against whichever credential the authenticator says was used, and if
// valid, mints a real Supabase session for that credential's owner.
//
// The signature check IS the authentication — equivalent to checking a
// password. Turning that into an actual Supabase session (without a
// second password prompt, and without sending a real email) uses
// admin.generateLink({ type: 'magiclink' }): it never sends anything, it
// just returns a token_hash server-side, which we hand back to the
// already-verified client to redeem via supabase.auth.verifyOtp(). This
// is the documented pattern for bridging a custom auth check into a real
// Supabase Auth session.
//
// Deploy: supabase functions deploy webauthn-login-verify

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuthenticationResponse } from "https://esm.sh/@simplewebauthn/server@13";
import { fromBase64Url } from "../_shared/webauthn-encoding.ts";

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

    const { response } = await req.json();
    const credentialId = response?.id;
    if (!credentialId) return json({ error: "Missing credential" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: credRow } = await admin
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", credentialId)
      .maybeSingle();
    if (!credRow) return json({ error: "This device isn't registered for biometric login" }, 400);

    // Usernameless flow means we don't know in advance which challenge
    // row belongs to this attempt — but correctness doesn't depend on
    // picking the "right" one: verifyAuthenticationResponse only
    // succeeds if the challenge matches what's cryptographically signed
    // into the assertion, so a mismatched row simply fails verification.
    const { data: challengeRow } = await admin
      .from("webauthn_challenges")
      .select("*")
      .eq("type", "authentication")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!challengeRow || new Date(challengeRow.expires_at) < new Date()) {
      return json({ error: "Login challenge expired — try again" }, 400);
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credRow.credential_id,
        publicKey: fromBase64Url(credRow.public_key),
        counter: Number(credRow.counter),
        transports: credRow.transports ?? undefined,
      },
    });

    if (!verification.verified) return json({ error: "Verification failed" }, 400);

    await admin
      .from("webauthn_credentials")
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq("id", credRow.id);
    await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    const { data: userRow, error: userErr } = await admin.auth.admin.getUserById(credRow.user_id);
    if (userErr || !userRow.user?.email) return json({ error: "Account not found" }, 400);

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userRow.user.email,
    });
    if (linkError || !linkData) return json({ error: linkError?.message ?? "Could not start session" }, 500);

    await admin.from("audit_log").insert({
      actor_user_id: credRow.user_id,
      action: "webauthn_login",
      target_table: "webauthn_credentials",
      target_id: credRow.id,
      metadata: null,
    });

    return json({ email: userRow.user.email, token_hash: linkData.properties.hashed_token }, 200);
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
