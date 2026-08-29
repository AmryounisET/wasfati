import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { ProfileForm } from "./ProfileForm";

export default async function PersonalInfoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, user_type, phone_number")
    .eq("id", user.id)
    .single();

  return (
    <Screen>
      <PageHeader title={t.profile.title} />
      {profile && <ProfileForm profile={profile} email={user.email ?? ""} />}
    </Screen>
  );
}
