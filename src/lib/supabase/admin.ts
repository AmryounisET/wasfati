import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/supabase/types";

/** Server-side gate for every /admin page: confirms the caller is signed in
 * and looked up in admin_users. RLS enforces the same check independently
 * on every query, so this is only for UI gating (redirect / access-denied),
 * never the sole line of defense. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return { supabase, user, role: (adminRow?.role ?? null) as AdminRole | null };
}

export function canWriteCatalog(role: AdminRole | null) {
  return role === "pharmacist_reviewer" || role === "superadmin";
}

export function canWriteLegal(role: AdminRole | null) {
  return role === "superadmin";
}
