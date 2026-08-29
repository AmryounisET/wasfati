import { requireAdmin } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";

export default async function AdminCareCirclePage() {
  const { supabase } = await requireAdmin();

  const [{ data: links }, { data: users }] = await Promise.all([
    supabase.from("care_circle_links").select("*").order("created_at", { ascending: false }),
    supabase.rpc("admin_list_users"),
  ]);

  const usersById = new Map((users ?? []).map((u) => [u.id, u]));
  const rows = links ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-ink-900">Care Circle Links</h1>
        <p className="text-bodys text-ink-500">
          {rows.length} family/caregiver {rows.length === 1 ? "link" : "links"} across all users.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-ink-100">
        <table className="w-full text-start text-bodys">
          <thead className="bg-ink-100 text-caption font-semibold text-ink-500">
            <tr>
              <th className="px-3 py-2 text-start">Patient</th>
              <th className="px-3 py-2 text-start">Caregiver</th>
              <th className="px-3 py-2 text-start">Relation</th>
              <th className="px-3 py-2 text-start">Status</th>
              <th className="px-3 py-2 text-start">Permissions</th>
              <th className="px-3 py-2 text-start">Since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const owner = usersById.get(l.owner_user_id);
              const caregiver = l.caregiver_user_id ? usersById.get(l.caregiver_user_id) : null;
              const permissions = [
                l.can_view_schedule && "Schedule",
                l.can_view_missed_dose_alerts && "Alerts",
                l.can_view_health_profile && "Health profile",
              ].filter(Boolean);
              return (
                <tr key={l.id} className="border-t border-ink-100 align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium text-ink-900">{owner?.full_name || "—"}</p>
                    <p className="text-caption text-ink-500">{owner?.email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-ink-700">{caregiver?.full_name || "(not registered yet)"}</p>
                    <p className="text-caption text-ink-500">{l.caregiver_email}</p>
                  </td>
                  <td className="px-3 py-2 text-ink-700">{l.relation || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={l.status === "linked" ? "success" : l.status === "pending" ? "warning" : "danger"}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-caption text-ink-500">
                    {permissions.length > 0 ? permissions.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2 text-ink-500">{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-500">
                  No care circle links yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
