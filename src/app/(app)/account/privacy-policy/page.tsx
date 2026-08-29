import { Lock, ShieldCheck, Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/Badge";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function PrivacyPolicyPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: doc } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("doc_type", "privacy")
    .eq("locale", locale)
    .maybeSingle();

  const sections = [
    { icon: Lock, title: t.privacyPolicy.dataCollectionTitle, subtitle: t.privacyPolicy.dataCollectionSubtitle, body: t.privacyPolicy.dataCollectionBody },
    { icon: ShieldCheck, title: t.privacyPolicy.encryptionTitle, subtitle: t.privacyPolicy.encryptionSubtitle, body: t.privacyPolicy.encryptionBody },
    { icon: Bot, title: t.privacyPolicy.aiTitle, subtitle: t.privacyPolicy.aiSubtitle, body: t.privacyPolicy.aiBody },
  ];

  return (
    <Screen>
      <PageHeader title={t.privacyPolicy.title} />

      <div className="mb-4 flex items-center justify-between text-caption text-ink-500">
        <span>
          {doc ? new Date(doc.updated_at).toLocaleDateString() : `${t.privacyPolicy.lastUpdated} · ${t.privacyPolicy.lastUpdatedEn}`}
        </span>
        <Badge variant="success">{doc ? `v${doc.version}` : t.privacyPolicy.version}</Badge>
      </div>

      {doc ? (
        <div className="whitespace-pre-wrap rounded-lg border border-ink-100 p-4 text-bodym text-ink-700">
          {doc.content}
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg bg-primary-050 p-4">
            <p className="text-bodys text-primary-900">
              {t.privacyPolicy.intro}
              <br />
              <span className="text-caption">{t.privacyPolicy.introEn}</span>
            </p>
          </div>

          <div className="space-y-3">
            {sections.map((s) => (
              <div key={s.title} className="rounded-lg border border-ink-100 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <s.icon size={18} className="text-primary-700" />
                  <div>
                    <p className="text-h3 font-bold text-ink-900">{s.title}</p>
                    <p className="text-caption text-ink-500">{s.subtitle}</p>
                  </div>
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
