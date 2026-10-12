import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

// The marketing landing page (LandingPage.tsx + /admin/landing-page CMS) is
// switched off: visitors to "/" go straight to the app. Restore the previous
// version of this file from git history (commit 6cae2a6) to re-enable it.
export default async function RootPage() {
  const user = await getUser();

  redirect(user ? "/home" : "/login");
}
