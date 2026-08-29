// WASFATI — admin-reset-password Edge Function
//
// Lets an admin generate a new temporary password for an existing user
// (e.g. a demo/test account at a dummy email address that can't receive a
// real password-reset link). Same server-side-only pattern as
// admin-create-user: auth.admin.updateUserById needs the service-role key,
// which only exists here, never in the browser.
//
// Deploy: supabase functions deploy admin-reset-password

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

    const { user_id, password } = await req.json();
    if (!user_id || typeof user_id !== "string") return json({ error: "user_id is required" }, 400);
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
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user_id, {
      password: tempPassword,
    });
    if (updateError || !updated.user) {
      return json({ error: updateError?.message ?? "Failed to reset password" }, 400);
    }

    await admin.from("audit_log").insert({
      actor_user_id: callerData.user.id,
      action: "user_password_reset",
      target_table: "profiles",
      target_id: user_id,
      metadata: { email: updated.user.email },
    });

    return json({ email: updated.user.email, temp_password: tempPassword }, 200);
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
