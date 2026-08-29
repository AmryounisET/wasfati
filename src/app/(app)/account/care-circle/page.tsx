import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { CareCircleClient } from "./CareCircleClient";

export default async function CareCirclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const [{ data: links }, { data: incoming }] = await Promise.all([
    supabase
      .from("care_circle_links")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("pending_care_circle_invites"),
  ]);

  return (
    <Screen>
      <PageHeader title={t.careCircle.title} />
      <p className="mb-4 text-bodys text-ink-500">{t.careCircle.subtitle}</p>
      <CareCircleClient links={links ?? []} incoming={incoming ?? []} />
    </Screen>
  );
}
