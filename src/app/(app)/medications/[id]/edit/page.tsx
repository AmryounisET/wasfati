import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { EditMedicationForm } from "./EditMedicationForm";

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: medication } = await supabase
    .from("medications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!medication) notFound();

  return (
    <Screen>
      <PageHeader title={t.medications.editPageTitle} closeButton />
      <EditMedicationForm medication={medication} />
    </Screen>
  );
}
