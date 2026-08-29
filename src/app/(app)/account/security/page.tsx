import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { SecurityClient } from "./SecurityClient";

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: credentials } = await supabase
    .from("webauthn_credentials")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <Screen>
      <PageHeader title={t.security.title} />
      <SecurityClient initialCredentials={credentials ?? []} />
    </Screen>
  );
}
