import { createClient, getUser } from "@/lib/supabase/server";
import { QuickCheckClient } from "./QuickCheckClient";

export default async function QuickCheckPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();

  return <QuickCheckClient userType={profile?.user_type ?? "patient"} />;
}
