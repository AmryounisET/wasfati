import { requireAdmin, canWriteCatalog } from "@/lib/supabase/admin";
import { InteractionsManager } from "./InteractionsManager";

export default async function AdminInteractionsPage() {
  const { supabase, role } = await requireAdmin();

  const [{ data: interactions }, { count }, { data: version }] = await Promise.all([
    supabase.from("interactions").select("*").order("updated_at", { ascending: false }).limit(50),
    supabase.from("interactions").select("*", { count: "exact", head: true }),
    supabase.from("data_versions").select("*").eq("table_name", "interactions").maybeSingle(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-ink-900">Drug Interactions</h1>
        <p className="text-bodys text-ink-500">
          {count ?? 0} rules — the interaction engine&apos;s sole authority on medical risk. Never AI-generated.
        </p>
      </div>

      <InteractionsManager
        initialRows={interactions ?? []}
        initialCount={count ?? 0}
        initialVersion={version ?? null}
        canWrite={canWriteCatalog(role)}
      />
    </div>
  );
}
