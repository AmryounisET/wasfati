import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Server-side gate for the Quick Interaction Check flow, which is a
 * patient-only feature (students/providers already read full clinical
 * detail via the normal add-medicine + safety-result flow, so the
 * simplified "just tell me if it's safe" shortcut isn't aimed at them).
 * Redirects away rather than rendering an access-denied screen, since a
 * misdirected link here isn't a permissions error worth surfacing loudly —
 * just send the user back to their home page. */
export async function requirePatient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();
  if (profile?.user_type !== "patient") redirect("/home");

  return { supabase, user };
}
