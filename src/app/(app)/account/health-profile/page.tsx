import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { HealthProfileForm } from "./HealthProfileForm";

export default async function HealthProfilePage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <Screen>
      <PageHeader title={t.healthProfile.title} />
      {profile && <HealthProfileForm profile={profile} />}
    </Screen>
  );
}
