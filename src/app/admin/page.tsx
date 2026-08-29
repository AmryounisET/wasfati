import { AlertTriangle, ShieldAlert, Users, Pill } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { HighSeverityAlerts } from "./HighSeverityAlerts";

export default async function AdminPage() {
  const { supabase, role } = await requireAdmin();

  const locale = await getLocale();
  const t = getDictionary(locale);

  const [
    { count: medicationCount },
    { count: interactionCount },
    { count: drugCount },
    { data: users },
    { data: recentHighSeverity },
  ] = await Promise.all([
    supabase.from("medications").select("*", { count: "exact", head: true }),
    supabase.from("interactions").select("*", { count: "exact", head: true }),
    supabase.from("drugs").select("*", { count: "exact", head: true }),
    supabase.rpc("admin_list_users"),
    supabase
      .from("interaction_results")
      .select("*")
      .eq("severity", "high")
      .order("checked_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-ink-900">{t.admin.dashboardTitle}</h1>
        <p className="text-bodys text-ink-500">Wasfati Admin</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="flex items-center gap-3">
          <Users className="text-primary-700" size={20} />
          <div>
            <p className="text-h2 font-bold text-ink-900">{users?.length ?? 0}</p>
            <p className="text-caption text-ink-500">{t.admin.totalUsers}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Pill className="text-primary-700" size={20} />
          <div>
            <p className="text-h2 font-bold text-ink-900">{drugCount ?? 0}</p>
            <p className="text-caption text-ink-500">Catalog drugs</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <ShieldAlert className="text-primary-700" size={20} />
          <div>
            <p className="text-h2 font-bold text-ink-900">{interactionCount ?? 0}</p>
            <p className="text-caption text-ink-500">{t.admin.totalInteractions}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Pill className="text-primary-700" size={20} />
          <div>
            <p className="text-h2 font-bold text-ink-900">{medicationCount ?? 0}</p>
            <p className="text-caption text-ink-500">{t.admin.totalMedications}</p>
          </div>
        </Card>
      </div>

      {(interactionCount ?? 0) === 0 && (
        <Card className="mb-6 border-warning-100 bg-warning-050">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-warning-700" size={18} />
            <p className="text-bodys text-warning-700">{t.admin.emptyInteractionsWarning}</p>
          </div>
        </Card>
      )}

      <h2 className="mb-3 text-h2 font-bold text-ink-900">{t.admin.recentHighSeverityTitle}</h2>
      <HighSeverityAlerts
        initialResults={recentHighSeverity ?? []}
        users={users ?? []}
        role={role}
        severityLabel={t.severity.high}
        noHighSeverityLabel={t.admin.noHighSeverity}
      />
    </div>
  );
}
