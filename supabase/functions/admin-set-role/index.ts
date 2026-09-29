// WASFATI — admin-set-role Edge Function
//
// Grants or revokes superadmin status. There is only one elevated tier in
// this app — a user either has a row in admin_users (superadmin) or
// doesn't (normal user) — and only the original superadmin account can
// change that for anyone, checked by email rather than by role, so this
// authority can never be delegated or duplicated by promoting someone
// else. admin_users has no client-writable RLS policy at all, so this is
// the only path to changing it outside the Supabase SQL editor.
//
// Deploy: supabase functions deploy admin-set-role

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

    const { user_id, make_superadmin } = await req.json();
    if (!user_id || typeof user_id !== "string") return json({ error: "user_id is required" }, 400);
    if (typeof make_superadmin !== "boolean") return json({ error: "make_superadmin must be a boolean" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !callerData.user) return json({ error: "Invalid session" }, 401);

    if (callerData.user.email?.toLowerCase() !== ORIGINAL_SUPERADMIN_EMAIL) {
      return json({ error: "Only the original superadmin account can change user roles." }, 403);
    }

    if (user_id === callerData.user.id) {
      return json({ error: "You cannot change your own role." }, 400);
    }

    if (make_superadmin) {
      const { error: upsertError } = await admin
        .from("admin_users")
        .upsert({ user_id, role: "superadmin" }, { onConflict: "user_id" });
      if (upsertError) return json({ error: upsertError.message }, 400);
    } else {
      const { error: deleteError } = await admin.from("admin_users").delete().eq("user_id", user_id);
      if (deleteError) return json({ error: deleteError.message }, 400);
    }

    await admin.from("audit_log").insert({
      actor_user_id: callerData.user.id,
      action: make_superadmin ? "user_promote_superadmin" : "user_demote_superadmin",
      target_table: "admin_users",
      target_id: user_id,
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
