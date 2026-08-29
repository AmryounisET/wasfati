// WASFATI — webauthn-register-verify Edge Function
//
// Step 2 of enrolling a biometric/passkey: verifies the browser's
// navigator.credentials.create() attestation against the challenge from
// webauthn-register-options, then stores the credential's public key.
// The private key never leaves the device's secure enclave — only the
// public key and a signature counter are stored here.
//
// Deploy: supabase functions deploy webauthn-register-verify

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyRegistrationResponse } from "https://esm.sh/@simplewebauthn/server@13";
import { toBase64Url } from "../_shared/webauthn-encoding.ts";

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

    const { response, label } = await req.json();
    if (!response) return json({ error: "Missing response" }, 400);

    const { data: challengeRow } = await admin
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "registration")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!challengeRow || new Date(challengeRow.expires_at) < new Date()) {
      return json({ error: "Registration challenge expired — try again" }, 400);
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return json({ error: "Could not verify this device" }, 400);
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const { error: insertError } = await admin.from("webauthn_credentials").insert({
      user_id: user.id,
      credential_id: credential.id,
      public_key: toBase64Url(credential.publicKey),
      counter: credential.counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: credential.transports ?? null,
      label: typeof label === "string" ? label.slice(0, 100) : null,
    });
    if (insertError) return json({ error: insertError.message }, 400);

    await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "webauthn_register",
      target_table: "webauthn_credentials",
      target_id: null,
      metadata: { device_type: credentialDeviceType },
    });

    return json({ verified: true }, 200);
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
