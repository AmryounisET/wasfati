import { FileCheck, ShieldAlert, UserCheck, Lock, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/Badge";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function TermsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: doc } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("doc_type", "terms")
    .eq("locale", locale)
    .maybeSingle();

  const sections = [
    { icon: FileCheck, title: t.termsAndConditions.acceptanceTitle, body: t.termsAndConditions.acceptanceBody },
    { icon: ShieldAlert, title: t.termsAndConditions.medicalDisclaimerTitle, body: t.termsAndConditions.medicalDisclaimerBody },
    { icon: UserCheck, title: t.termsAndConditions.userResponsibilitiesTitle, body: t.termsAndConditions.userResponsibilitiesBody },
    { icon: Lock, title: t.termsAndConditions.accountTitle, body: t.termsAndConditions.accountBody },
    { icon: RefreshCw, title: t.termsAndConditions.changesTitle, body: t.termsAndConditions.changesBody },
  ];

  return (
    <Screen>
      <PageHeader title={t.termsAndConditions.title} />

      <div className="mb-4 flex items-center justify-between text-caption text-ink-500">
        <span>{doc ? new Date(doc.updated_at).toLocaleDateString() : t.termsAndConditions.lastUpdated}</span>
        <Badge variant="success">{doc ? `v${doc.version}` : t.termsAndConditions.version}</Badge>
      </div>

      {doc ? (
        <div className="whitespace-pre-wrap rounded-lg border border-ink-100 p-4 text-bodym text-ink-700">
          {doc.content}
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg bg-primary-050 p-4">
            <p className="text-bodys text-primary-900">{t.termsAndConditions.intro}</p>
          </div>

          <div className="space-y-3">
            {sections.map((s) => (
              <div key={s.title} className="rounded-lg border border-ink-100 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <s.icon size={18} className="text-primary-700" />
                  <p className="text-h3 font-bold text-ink-900">{s.title}</p>
                </div>
                <p className="text-bodym text-ink-700">{s.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}
