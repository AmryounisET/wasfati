// WASFATI — care-circle-invite Edge Function
//
// A patient (owner) invites a family member/caregiver by email. Two
// outcomes depending on whether that email already belongs to a Wasfati
// account:
//
//  - New email: creates the account via admin.inviteUserByEmail(), which
//    sends a REAL email through Supabase Auth's own invite template — no
//    custom SMTP/email service needed. The link logs them in and lands on
//    /auth/callback -> /care-circle/accept, where they finish setting up
//    their account (name, password) and the invite is marked accepted.
//  - Existing email: no email is sent (Supabase Auth has no generic
//    "send this custom email to an existing user" API without configuring
//    custom SMTP, which this project doesn't have). Instead the pending
//    invite is linked directly to their account and surfaces in-app, on
//    their own Care Circle page and as a home banner, next time they sign
//    in — the owner should let them know directly in this case.
//
// Deploy: supabase functions deploy care-circle-invite

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) return json({ error: "A valid email is required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ownerData, error: ownerErr } = await userClient.auth.getUser();
    if (ownerErr || !ownerData.user) return json({ error: "Invalid session" }, 401);
    const owner = ownerData.user;

    if (owner.email?.toLowerCase() === email) {
      return json({ error: "You can't add yourself to your own care circle" }, 400);
    }

    const { data: existingLink } = await admin
      .from("care_circle_links")
      .select("*")
      .eq("owner_user_id", owner.id)
      .eq("caregiver_email", email)
      .maybeSingle();
    if (existingLink && existingLink.status !== "revoked") {
      return json({ error: "This person has already been invited" }, 400);
    }

    // Scan for an existing Wasfati account with this email. Supabase's
    // admin API has no direct getUserByEmail, only paginated listUsers —
    // fine at this app's current scale; would need a proper indexed
    // lookup (e.g. a security-definer SQL function) if the user base
    // grows large.
    let caregiverUserId: string | null = null;
    for (let page = 1; page <= 5; page++) {
      const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listErr || !pageData) break;
      const match = pageData.users.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        caregiverUserId = match.id;
        break;
      }
      if (pageData.users.length < 1000) break;
    }

    let emailSent = false;
    if (!caregiverUserId) {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/care-circle/accept")}`,
      });
      if (inviteError || !invited.user) {
        return json({ error: inviteError?.message ?? "Failed to send invite" }, 400);
      }
      caregiverUserId = invited.user.id;
      emailSent = true;
    }

    const linkPayload = {
      owner_user_id: owner.id,
      caregiver_user_id: caregiverUserId,
      caregiver_email: email,
      relation: typeof body.relation === "string" && body.relation.trim() ? body.relation.trim() : null,
      status: "pending",
      can_view_schedule: body.can_view_schedule ?? true,
      can_view_missed_dose_alerts: body.can_view_missed_dose_alerts ?? true,
      can_view_health_profile: body.can_view_health_profile ?? false,
    };

    const { data: linkRow, error: linkError } = existingLink
      ? await admin.from("care_circle_links").update(linkPayload).eq("id", existingLink.id).select().single()
      : await admin.from("care_circle_links").insert(linkPayload).select().single();
    if (linkError || !linkRow) return json({ error: linkError?.message ?? "Failed to save invite" }, 500);

    await admin.from("audit_log").insert({
      actor_user_id: owner.id,
      action: "care_circle_invite",
      target_table: "care_circle_links",
      target_id: linkRow.id,
      metadata: { email, email_sent: emailSent },
    });

    return json({ link: linkRow, email_sent: emailSent }, 200);
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
