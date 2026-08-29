import Link from "next/link";
import { Bell, ShieldCheck, Users, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/layout/Screen";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { DoseList } from "./DoseList";
import { Greeting } from "./Greeting";
import { isDueDosePast } from "@/lib/dose-schedule";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, interpolate } from "@/lib/i18n/get-dictionary";
import { displayName } from "@/lib/i18n/transliterate";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { data: profile },
    { data: medications },
    { data: todayLogs },
    { data: recentResults },
    { data: adminRow },
    { data: incomingInvites },
    { data: linkedOwners },
    { data: careLinks },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("medications")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("dose_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_at", startOfDay.toISOString()),
    supabase
      .from("interaction_results")
      .select("*")
      .eq("user_id", user.id)
      .order("checked_at", { ascending: false })
      .limit(20),
    supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("pending_care_circle_invites"),
    supabase.rpc("linked_owner_names"),
    supabase
      .from("care_circle_links")
      .select("owner_user_id, can_view_missed_dose_alerts")
      .eq("caregiver_user_id", user.id)
      .eq("status", "linked"),
  ]);

  const isSuperadmin = adminRow?.role === "superadmin";

  const meds = medications ?? [];

  // interaction_results is a historical log — a past alert stays in it
  // even after the medicine that caused it is deleted. Only surface one
  // whose medicines are ALL still in the current active list, so removing
  // the offending medicine actually clears the home banner.
  // check-interactions persists medication_names from each medication's
  // generic_name (the ingredient the rule matched on), not its display
  // name — so the active set must be keyed the same way, or a real
  // interaction never matches and the banner stays stuck on "no concerns".
  const activeMedNames = new Set(meds.map((m) => m.generic_name.trim().toLowerCase()));
  const latestResult = (recentResults ?? []).find((r) =>
    r.medication_names.every((name) => activeMedNames.has(name.trim().toLowerCase())),
  );
  const confirmedMedicationIds = new Set(
    (todayLogs ?? []).filter((l) => l.confirmed_at).map((l) => l.medication_id),
  );

  const missed = meds.filter(
    (m) => !confirmedMedicationIds.has(m.id) && isDueDosePast(m.frequency),
  );

  const firstName = displayName(profile?.full_name || "", locale).split(" ")[0];

  const missedAlertsByOwner = new Map(
    (careLinks ?? []).map((l) => [l.owner_user_id, l.can_view_missed_dose_alerts]),
  );
  const family = await Promise.all(
    (linkedOwners ?? []).map((owner) =>
      loadFamilyOverview(supabase, owner, startOfDay, missedAlertsByOwner.get(owner.owner_user_id) ?? false),
    ),
  );

  return (
    <Screen>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-bodys text-ink-500">
            <Greeting /> 👋
          </p>
          <h1 className="text-h1 font-bold text-ink-900">{firstName || t.home.fallbackName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isSuperadmin && (
            <Link
              href="/admin"
              aria-label={t.admin.openAdminPanel}
              title={t.admin.openAdminPanel}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-050 text-primary-900"
            >
              <ShieldCheck size={18} />
            </Link>
          )}
          <Link
            href="/notifications"
            aria-label={t.nav.home}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary-050 text-primary-900"
          >
            <Bell size={18} />
            {missed.length > 0 && (
              <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-danger-500" />
            )}
          </Link>
        </div>
      </header>

      <div className="mb-4 space-y-3">
        {(incomingInvites ?? []).length > 0 && (
          <Link href="/account/care-circle">
            <Banner variant="info" title={t.careCircle.incomingRequestsTitle}>
              <p className="text-bodys">
                {(incomingInvites ?? [])[0].owner_name} {t.careCircle.invitedYouAs}
              </p>
            </Banner>
          </Link>
        )}

        {missed.map((m) => (
          <Banner key={m.id} variant="danger" title={t.home.missedDoseTitle}>
            <p className="text-bodys">
              {interpolate(t.home.missedDoseBody, { name: m.name, dose: m.dose })}
              <br />
              <span className="text-caption">
                {interpolate(t.home.missedDoseBodyEn, { name: m.name, dose: m.dose })}
              </span>
            </p>
          </Banner>
        ))}

        {(() => {
          const hasConcern = !!latestResult && latestResult.severity !== "low";
          const banner = (
            <Banner
              variant={!latestResult || latestResult.severity === "low" ? "success" : latestResult.severity === "high" ? "danger" : "warning"}
              title={hasConcern ? t.home.safetyAlertTitle : t.home.safetyOkTitle}
            >
              <p className="text-caption">{hasConcern ? t.home.safetyAlertBody : t.home.safetyOkBody}</p>
            </Banner>
          );
          return hasConcern ? <Link href={`/safety-result?ids=${latestResult.id}`}>{banner}</Link> : banner;
        })()}
      </div>

      <h2 className="mb-3 text-h2 font-bold text-ink-900">{t.home.todayDoses}</h2>
      <DoseList medications={meds} confirmedIds={[...confirmedMedicationIds]} />

      {family.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-h2 font-bold text-ink-900">{t.home.familyTitle}</h2>
          <div className="space-y-3">
            {family.map((f) => {
              const hasConcern = !!f.latestResult && f.latestResult.severity !== "low";
              const href = hasConcern ? `/safety-result?ids=${f.latestResult!.id}` : "/medications";
              return (
                <Link key={f.ownerId} href={href}>
                  <Card>
                    <div className="mb-1 flex items-center gap-2">
                      <Users size={16} className="shrink-0 text-primary-700" />
                      <p className="text-h3 font-bold text-ink-900">{f.ownerName}</p>
                    </div>
                    <p className="text-bodys text-ink-500">
                      {f.totalMeds > 0
                        ? interpolate(t.home.familyDosesTaken, {
                            confirmed: String(f.confirmedCount),
                            total: String(f.totalMeds),
                          })
                        : t.home.familyNoMeds}
                    </p>
                    {f.canViewMissedAlerts && f.missedCount > 0 && (
                      <p className="mt-1 text-caption text-danger-500">
                        {interpolate(t.home.familyMissedDose, { count: String(f.missedCount) })}
                      </p>
                    )}
                    {f.totalMeds > 0 && (
                      <p
                        className={`mt-2 flex items-center gap-1 text-caption font-semibold ${
                          hasConcern ? "text-danger-500" : "text-success-700"
                        }`}
                      >
                        {hasConcern && <ShieldAlert size={14} />}
                        {hasConcern ? t.home.familySafetyAlert : t.home.familySafetyOk}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </Screen>
  );
}

async function loadFamilyOverview(
  supabase: SupabaseClient<Database>,
  owner: { owner_user_id: string; full_name: string },
  startOfDay: Date,
  canViewMissedAlerts: boolean,
) {
  const [{ data: oMeds }, { data: oLogs }, { data: oResults }] = await Promise.all([
    supabase
      .from("medications")
      .select("*")
      .eq("user_id", owner.owner_user_id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("dose_logs")
      .select("*")
      .eq("user_id", owner.owner_user_id)
      .gte("scheduled_at", startOfDay.toISOString()),
    supabase
      .from("interaction_results")
      .select("*")
      .eq("user_id", owner.owner_user_id)
      .order("checked_at", { ascending: false })
      .limit(20),
  ]);

  const meds = oMeds ?? [];
  const confirmedIds = new Set((oLogs ?? []).filter((l) => l.confirmed_at).map((l) => l.medication_id));
  const missedCount = meds.filter((m) => !confirmedIds.has(m.id) && isDueDosePast(m.frequency)).length;

  const activeNames = new Set(meds.map((m) => m.generic_name.trim().toLowerCase()));
  const latestResult = (oResults ?? []).find((r) =>
    r.medication_names.every((name) => activeNames.has(name.trim().toLowerCase())),
  );

  return {
    ownerId: owner.owner_user_id,
    ownerName: owner.full_name,
    totalMeds: meds.length,
    confirmedCount: meds.filter((m) => confirmedIds.has(m.id)).length,
    missedCount,
    canViewMissedAlerts,
    latestResult,
  };
}
