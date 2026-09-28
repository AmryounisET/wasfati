import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LANDING_CONTENT } from "@/lib/landing-content";
import { LandingPage } from "./LandingPage";
import type { LandingLocale } from "@/lib/supabase/types";

export default async function RootPage() {
  const user = await getUser();
  if (user) redirect("/home");

  const locale = await getLocale();
  const landingLocale: LandingLocale = locale === "ar" ? "ar" : "en";

  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_page_content")
    .select("content")
    .eq("locale", landingLocale)
    .maybeSingle();

  const content = data?.content ?? DEFAULT_LANDING_CONTENT[landingLocale];

  return <LandingPage content={content} locale={landingLocale} />;
}
