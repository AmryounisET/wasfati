import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./PrintButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, interpolate } from "@/lib/i18n/get-dictionary";
import { INTL_TAG } from "@/lib/i18n/locales";
import { displayName } from "@/lib/i18n/transliterate";
import { getDisplaySummary } from "@/lib/interaction-display";

export default async function MedicationReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const [{ data: profile }, { data: medications }, { data: results }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("medications")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("interaction_results")
      .select("*")
      .eq("user_id", user.id)
      .order("checked_at", { ascending: false })
      .limit(15),
  ]);

  const generatedAt = new Date().toLocaleString(INTL_TAG[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-2xl bg-white px-6 py-8 text-ink-900 print:px-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <h1 className="text-h1 font-bold text-ink-900">{t.report.previewTitle}</h1>
        <PrintButton />
      </div>

      <header className="mb-6 border-b border-ink-200 pb-4">
        <h1 className="text-h1 font-bold text-primary-900">{t.report.reportTitle}</h1>
        <p className="text-bodys text-ink-500">{t.report.reportSubtitleEn}</p>
        <p className="mt-2 text-bodym">
          <strong>{profile?.full_name ? displayName(profile.full_name, locale) : "—"}</strong>
          {profile?.age ? ` · ${profile.age} ${t.healthProfile.yearsUnit}` : ""}
          {profile?.sex ? ` · ${profile.sex === "male" ? t.healthProfile.male : t.healthProfile.female}` : ""}
          {profile?.blood_type ? ` · ${t.healthProfile.bloodTypeLabel}: ${profile.blood_type}` : ""}
        </p>
        <p className="text-caption text-ink-500">{interpolate(t.report.generatedAt, { date: generatedAt })}</p>
      </header>

      {(profile?.allergies?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-h3 font-bold text-danger-700">{t.healthProfile.allergiesLabel}</h2>
          <p className="text-bodym">{profile!.allergies.join("، ")}</p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-h3 font-bold text-ink-900">
          {interpolate(t.report.activeMedsTitle, { count: medications?.length ?? 0 })}
        </h2>
        <table className="w-full border-collapse text-bodys">
          <thead>
            <tr className="border-b border-ink-300 text-start">
              <th className="py-2 text-start">{t.report.tableName}</th>
              <th className="py-2 text-start">{t.report.tableDose}</th>
              <th className="py-2 text-start">{t.report.tableFrequency}</th>
              <th className="py-2 text-start">{t.report.tableStartDate}</th>
            </tr>
          </thead>
          <tbody>
            {(medications ?? []).map((m) => (
              <tr key={m.id} className="border-b border-ink-100">
                <td className="py-2">
                  {m.name}
                  <div className="text-caption text-ink-500">{m.generic_name}</div>
                </td>
                <td className="py-2">{m.dose}</td>
                <td className="py-2">{m.frequency}</td>
                <td className="py-2">{new Date(m.start_date).toLocaleDateString(INTL_TAG[locale])}</td>
              </tr>
            ))}
            {(medications ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-ink-500">
                  {t.report.noActiveMeds}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-h3 font-bold text-ink-900">{t.report.recentChecksTitle}</h2>
        {(results ?? []).length === 0 && <p className="text-bodym text-ink-500">{t.report.noChecksYet}</p>}
        <ul className="space-y-2">
          {(results ?? []).map((r) => (
            <li key={r.id} className="border-b border-ink-100 pb-2 text-bodys">
              <strong>{r.medication_names.join(" + ")}</strong> — {t.report.severityPrefix} {t.severity[r.severity]}
              <div className="text-ink-700">{getDisplaySummary(r, profile?.user_type ?? "patient", t)}</div>
              <div className="text-caption text-ink-500">
                {new Date(r.checked_at).toLocaleString(INTL_TAG[locale])}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 border-t border-ink-200 pt-4 text-caption text-ink-500">
        {t.report.footerDisclaimer} {t.report.footerDisclaimerEn}
      </footer>
    </div>
  );
}
