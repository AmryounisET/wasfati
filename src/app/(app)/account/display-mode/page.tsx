import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { DisplayModeForm } from "./DisplayModeForm";

export default async function DisplayModePage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: profile } = await supabase
    .from("profiles")
    .select("senior_friendly_mode")
    .eq("id", user.id)
    .single();

  return (
    <Screen>
      <PageHeader title={t.displayMode.title} />
      <p className="mb-5 text-bodys text-ink-500">{t.displayMode.subtitle}</p>
      <DisplayModeForm initialSeniorMode={profile?.senior_friendly_mode ?? false} />
    </Screen>
  );
}
