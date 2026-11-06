import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { BottomNav } from "@/components/ui/BottomNav";
import { SeniorModeSync } from "@/components/layout/SeniorModeSync";

// Loaded in its own Suspense boundary: the senior-mode flag only toggles a
// <html> attribute in an effect, so nothing should wait on this query —
// awaiting it in the layout delayed the nav bar and every page behind an
// extra sequential database round-trip on every tab switch.
async function SeniorModeLoader({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("senior_friendly_mode")
    .eq("id", userId)
    .single();
  return <SeniorModeSync enabled={profile?.senior_friendly_mode ?? false} />;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={null}>
        <SeniorModeLoader userId={user.id} />
      </Suspense>
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
