import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/ui/BottomNav";
import { SeniorModeSync } from "@/components/layout/SeniorModeSync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("senior_friendly_mode")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SeniorModeSync enabled={profile?.senior_friendly_mode ?? false} />
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
