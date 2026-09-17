import Link from "next/link";
import { AlertTriangle, BellRing, ShieldAlert } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { isDueDosePast } from "@/lib/dose-schedule";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, interpolate } from "@/lib/i18n/get-dictionary";
import { INTL_TAG } from "@/lib/i18n/locales";
import { getDisplaySummary } from "@/lib/interaction-display";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ data: medications }, { data: todayLogs }, { data: results }, { data: profile }] = await Promise.all([
    supabase.from("medications").select("*").eq("user_id", user.id).eq("archived", false),
    supabase
      .from("dose_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_at", startOfDay.toISOString()),
    supabase
      .from("interaction_results")
      .select("*")
      .eq("user_id", user.id)
      .in("severity", ["moderate", "high"])
      .order("checked_at", { ascending: false })
      .limit(10),
    supabase.from("profiles").select("user_type").eq("id", user.id).single(),
  ]);
  const userType = profile?.user_type ?? "patient";

  const confirmedIds = new Set((todayLogs ?? []).filter((l) => l.confirmed_at).map((l) => l.medication_id));
  const missed = (medications ?? []).filter((m) => !confirmedIds.has(m.id) && isDueDosePast(m.frequency));

  const hasNotifications = missed.length > 0 || (results ?? []).length > 0;

  return (
    <Screen>
      <PageHeader title={t.notifications.title} />

      {!hasNotifications && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <BellRing size={28} className="text-ink-400" />
          <p className="text-bodym text-ink-500">{t.notifications.empty}</p>
        </Card>
      )}

      <div className="space-y-3">
        {missed.map((m) => (
          <Link key={m.id} href="/medications">
            <Card className="flex items-start gap-3 border-danger-100 bg-danger-050">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger-700" />
              <div>
                <p className="text-h3 font-bold text-danger-700">{t.notifications.missedDoseTitle}</p>
                <p className="text-bodys text-danger-700">
                  {interpolate(t.notifications.missedDoseBody, { name: m.name, dose: m.dose })}
                </p>
              </div>
            </Card>
          </Link>
        ))}

        {(results ?? []).map((r) => (
          <Link key={r.id} href={`/safety-result?ids=${r.id}`}>
            <Card
              className={
                r.severity === "high"
                  ? "flex items-start gap-3 border-danger-100 bg-danger-050"
                  : "flex items-start gap-3 border-warning-100 bg-warning-050"
              }
            >
              <ShieldAlert
                size={20}
                className={`mt-0.5 shrink-0 ${r.severity === "high" ? "text-danger-700" : "text-warning-700"}`}
              />
              <div>
                <p className={`text-h3 font-bold ${r.severity === "high" ? "text-danger-700" : "text-warning-700"}`}>
                  {t.severity[r.severity]} — {r.medication_names.join(" + ")}
                </p>
                <p className={r.severity === "high" ? "text-bodys text-danger-700" : "text-bodys text-warning-700"}>
                  {getDisplaySummary(r, userType, t)}
                </p>
                <p className="mt-1 text-caption text-ink-500">
                  {new Date(r.checked_at).toLocaleString(INTL_TAG[locale])}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
