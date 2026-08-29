import { requireAdmin, canWriteLegal } from "@/lib/supabase/admin";
import { LegalDocsManager } from "./LegalDocsManager";

export default async function AdminLegalPage() {
  const { supabase, role } = await requireAdmin();

  const { data: docs } = await supabase.from("legal_documents").select("*");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-ink-900">Legal Documents</h1>
        <p className="text-bodys text-ink-500">
          Terms &amp; Conditions and Privacy Policy content, per language. Superadmin-only to edit — this is
          liability content, not clinical data. The app falls back to the built-in translated copy until a row
          exists for a given language.
        </p>
      </div>

      <LegalDocsManager initialDocs={docs ?? []} canWrite={canWriteLegal(role)} />
    </div>
  );
}
