import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LanguageForm } from "./LanguageForm";

export default async function LanguagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <Screen>
      <PageHeader title={t.language.title} />
      <p className="mb-5 text-bodys text-ink-500">{t.language.subtitle}</p>
      <LanguageForm />
    </Screen>
  );
}
