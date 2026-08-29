import Link from "next/link";
import { Plus, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { MedicationListClient } from "./MedicationListClient";
import type { Medication } from "@/lib/supabase/types";

export default async function MedicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const [{ data: medications }, { data: linkedOwners }] = await Promise.all([
    supabase.from("medications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.rpc("linked_owner_names"),
  ]);

  const relativeGroups: { ownerId: string; ownerName: string; medications: Medication[] }[] = [];
  if (linkedOwners && linkedOwners.length > 0) {
    const groups = await Promise.all(
      linkedOwners.map(async (owner) => {
        const { data } = await supabase
          .from("medications")
          .select("*")
          .eq("user_id", owner.owner_user_id)
          .order("created_at", { ascending: false });
        return { ownerId: owner.owner_user_id, ownerName: owner.full_name, medications: data ?? [] };
      }),
    );
    relativeGroups.push(...groups);
  }

  return (
    <Screen>
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-h1 font-bold text-ink-900">{t.medications.title}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/medications/history"
            aria-label={t.account.history}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-100 text-ink-700"
          >
            <History size={16} />
          </Link>
          <Link
            href="/add-medication"
            className="flex items-center gap-1 rounded-md bg-primary-050 px-3 py-2 text-bodys font-semibold text-primary-900"
          >
            <Plus size={16} />
            {t.nav.addMedicine}
          </Link>
        </div>
      </header>

      <MedicationListClient medications={medications ?? []} relativeGroups={relativeGroups} />
    </Screen>
  );
}
