import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { HistoryClient } from "./HistoryClient";

export default async function MedicationHistoryPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const [{ data: results }, { data: doseLogs }, { data: medications }, { data: profile }] = await Promise.all([
    supabase
      .from("interaction_results")
      .select("*")
      .eq("user_id", user.id)
      .order("checked_at", { ascending: false })
      .limit(30),
    supabase
      .from("dose_logs")
      .select("*")
      .eq("user_id", user.id)
      .not("confirmed_at", "is", null)
      .order("confirmed_at", { ascending: false })
      .limit(60),
    supabase.from("medications").select("*").eq("user_id", user.id),
    supabase.from("profiles").select("user_type").eq("id", user.id).single(),
  ]);

  return (
    <Screen>
      <PageHeader title={t.history.title} />
      <HistoryClient
        results={results ?? []}
        doseLogs={doseLogs ?? []}
        medications={medications ?? []}
        userType={profile?.user_type ?? "patient"}
      />
    </Screen>
  );
}
