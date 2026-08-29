import { requireAdmin, canWriteCatalog } from "@/lib/supabase/admin";
import { DrugsManager } from "./DrugsManager";

export default async function AdminDrugsPage() {
  const { supabase, role } = await requireAdmin();

  const [{ data: drugs }, { count }, { data: version }] = await Promise.all([
    supabase.from("drugs").select("*").order("trade_name", { ascending: true }).limit(50),
    supabase.from("drugs").select("*", { count: "exact", head: true }),
    supabase.from("data_versions").select("*").eq("table_name", "drugs").maybeSingle(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-ink-900">Drug Catalog</h1>
        <p className="text-bodys text-ink-500">
          {count ?? 0} trade-name products — the source of truth for the medicine search screen.
        </p>
      </div>

      <DrugsManager
        initialDrugs={drugs ?? []}
        initialCount={count ?? 0}
        initialVersion={version ?? null}
        canWrite={canWriteCatalog(role)}
      />
    </div>
  );
}
