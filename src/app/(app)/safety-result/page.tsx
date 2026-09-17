import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { Banner } from "@/components/ui/Banner";
import { ResultExplanation } from "./ResultExplanation";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, interpolate } from "@/lib/i18n/get-dictionary";
import { getDisplaySummary } from "@/lib/interaction-display";
import type { Severity } from "@/lib/supabase/types";

const severityBanner: Record<Severity, "danger" | "warning" | "info"> = {
  high: "danger",
  moderate: "warning",
  low: "info",
  unverified: "info",
};

export default function SafetyResultPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  return (
    <Suspense>
      <SafetyResultContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SafetyResultContent({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = ids?.split(",").filter(Boolean) ?? [];

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const severityTitle: Record<Severity, string> = {
    high: t.safetyResult.severityTitleHigh,
    moderate: t.safetyResult.severityTitleModerate,
    low: t.safetyResult.severityTitleLow,
    unverified: t.safetyResult.severityTitleUnverified,
  };

  const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
  const userType = profile?.user_type ?? "patient";

  const { data: results } = idList.length
    ? await supabase.from("interaction_results").select("*").in("id", idList)
    : { data: [] };

  const items = results ?? [];

  return (
    <Screen>
      <PageHeader title={t.safetyResult.title} />

      {items.length === 0 ? (
        <Banner variant="success" title={t.safetyResult.noConcernsTitle} className="mb-6">
          <p className="text-caption">{t.safetyResult.noConcernsBody}</p>
        </Banner>
      ) : (
        <div className="mb-6 space-y-4">
          {items.map((result) => (
            <div key={result.id}>
              <Banner variant={severityBanner[result.severity]} title={severityTitle[result.severity]}>
                <span className="rounded-pill bg-white/60 px-2 py-0.5 text-caption font-semibold">
                  {interpolate(t.safetyResult.severityBadge, { level: t.severity[result.severity] })}
                </span>
                {result.severity === "unverified" && (
                  <p className="mt-2 text-caption">{t.safetyResult.unverifiedNote}</p>
                )}
              </Banner>

              <div className="mt-3 rounded-md border border-ink-100 p-3">
                <p className="mb-1 text-caption text-ink-500">{t.safetyResult.interactingMeds}</p>
                <p className="text-h3 font-bold text-ink-900">{result.medication_names.join(" + ")}</p>
              </div>

              <div className="mt-3 rounded-md bg-primary-050 p-3">
                <p className="mb-1 text-h3 font-bold text-ink-900">{t.safetyResult.explanationTitle}</p>
                <p className="text-bodym text-ink-700">{getDisplaySummary(result, userType, t)}</p>
              </div>

              <ResultExplanation resultId={result.id} initialExplanation={result.ai_explanation} />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md bg-primary-050 p-3 text-caption text-primary-900">
        {t.safetyResult.disclaimer}
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href="/medications"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary-900 text-button font-bold text-white"
        >
          <ShieldCheck size={18} />
          {t.safetyResult.goToMedications}
        </Link>
        <Link
          href="/assistant"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary-100 text-button font-semibold text-primary-900"
        >
          {t.safetyResult.consultAssistant}
        </Link>
      </div>
    </Screen>
  );
}
