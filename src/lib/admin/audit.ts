import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Records an admin write for the audit trail (Project Rule #4). Best-effort:
 * a logging failure must never block the write it's describing, so errors
 * are swallowed rather than surfaced to the admin. */
export async function logAdminAction(
  supabase: SupabaseClient<Database>,
  actorUserId: string,
  action: string,
  targetTable: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
) {
  try {
    await supabase.from("audit_log").insert({
      actor_user_id: actorUserId,
      action,
      target_table: targetTable,
      target_id: targetId,
      metadata: metadata ?? null,
    });
  } catch {
    // non-fatal, see doc comment above
  }
}
