// WASFATI — admin-create-user Edge Function
//
// Lets a superadmin create a new user account from the admin panel. This
// has to run server-side with the service-role key (auth.admin.createUser
// isn't available to the anon/authenticated client), while still verifying
// the caller is an admin from their own JWT — same pattern as
// check-interactions and admin_list_users().
//
// Deploy: supabase functions deploy admin-create-user

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateTempPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "Wf-" + Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 14);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const { email, full_name, user_type, phone_number, password } = await req.json();
    if (!email || typeof email !== "string") return json({ error: "email is required" }, 400);
    if (!["patient", "student", "provider"].includes(user_type)) {
      return json({ error: "user_type must be patient, student, or provider" }, 400);
    }
    if (password !== undefined && password !== null && (typeof password !== "string" || password.length < 6)) {
      return json({ error: "password must be at least 6 characters" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !callerData.user) return json({ error: "Invalid session" }, 401);

    const { data: adminRow } = await admin
      .from("admin_users")
      .select("role")
      .eq("user_id", callerData.user.id)
      .maybeSingle();
    if (!adminRow) return json({ error: "Not authorized" }, 403);

    const tempPassword = password || generateTempPassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? "", user_type },
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Failed to create user" }, 400);
    }

    // handle_new_user() already inserted the profiles row from
    // user_metadata (full_name, user_type) — phone_number isn't part of
    // that trigger, so set it explicitly here.
    if (phone_number) {
      await admin.from("profiles").update({ phone_number }).eq("id", created.user.id);
    }

    await admin.from("audit_log").insert({
      actor_user_id: callerData.user.id,
      action: "user_create",
      target_table: "profiles",
      target_id: created.user.id,
      metadata: { email },
    });

    return json({ user: { id: created.user.id, email: created.user.email }, temp_password: tempPassword }, 200);
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
