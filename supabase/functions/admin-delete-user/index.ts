// WASFATI — admin-delete-user Edge Function
//
// Permanently deletes a user's Supabase Auth account. ON DELETE CASCADE on
// every user-owned table (profiles, medications, dose_logs,
// interaction_results, chat_messages, care_circle_links, admin_users, the
// webauthn tables) means this also erases all of that user's data — it's
// the real, irreversible counterpart to the in-app "Deactivate" flag
// (profiles.is_active), which only hides the account from safety checks
// and caregiver views without touching Auth or deleting anything.
// Superadmin-only, since it can't be undone, and the original superadmin
// account itself can never be deleted (see admin-set-role — deleting it
// would mean nobody could ever grant the role again). Same
// server-side-only pattern as admin-create-user/admin-reset-password:
// auth.admin.deleteUser needs the service-role key, which only exists
// here, never in the browser.
//
// Deploy: supabase functions deploy admin-delete-user

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ORIGINAL_SUPERADMIN_EMAIL } from "../_shared/original-superadmin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") return json({ error: "user_id is required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !callerData.user) return json({ error: "Invalid session" }, 401);

    if (user_id === callerData.user.id) {
      return json({ error: "You cannot delete your own account." }, 400);
    }

    const { data: adminRow } = await admin
      .from("admin_users")
      .select("role")
      .eq("user_id", callerData.user.id)
      .maybeSingle();
    if (adminRow?.role !== "superadmin") return json({ error: "Not authorized" }, 403);

    // Captured before deletion — both are gone from their normal tables
    // once auth.admin.deleteUser succeeds, and the audit row should still
    // say who this was.
    const { data: targetProfile } = await admin.from("profiles").select("full_name").eq("id", user_id).maybeSingle();
    const { data: targetUser } = await admin.auth.admin.getUserById(user_id);
    const targetEmail = targetUser?.user?.email ?? null;

    // Without this, any superadmin could delete the one account allowed to
    // grant/revoke superadmin status, and the role could never be granted
    // again by anyone.
    if (targetEmail?.toLowerCase() === ORIGINAL_SUPERADMIN_EMAIL) {
      return json({ error: "The original superadmin account cannot be deleted." }, 400);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return json({ error: deleteError.message ?? "Failed to delete user" }, 400);
    }

    await admin.from("audit_log").insert({
      actor_user_id: callerData.user.id,
      action: "user_delete",
      target_table: "profiles",
      target_id: user_id,
      metadata: { email: targetEmail, full_name: targetProfile?.full_name ?? null },
    });

    return json({ success: true }, 200);
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
