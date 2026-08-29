"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Trash2, ListX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAdminAction } from "@/lib/admin/audit";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { AdminRole, AdminUserDirectoryRow, InteractionResult } from "@/lib/supabase/types";

export function HighSeverityAlerts({
  initialResults,
  users,
  role,
  severityLabel,
  noHighSeverityLabel,
}: {
  initialResults: InteractionResult[];
  users: AdminUserDirectoryRow[];
  role: AdminRole | null;
  severityLabel: string;
  noHighSeverityLabel: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const usersById = new Map(users.map((u) => [u.id, u]));
  const canDelete = role === "superadmin";

  const [results, setResults] = useState(initialResults);
  const [confirmingDelete, setConfirmingDelete] = useState<InteractionResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  async function confirmDelete() {
    if (!confirmingDelete) return;
    const target = confirmingDelete;
    setDeleting(true);
    const { error } = await supabase.from("interaction_results").delete().eq("id", target.id);
    setDeleting(false);
    if (error) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAdminAction(supabase, user.id, "alert_delete", "interaction_results", target.id, {
        medication_names: target.medication_names,
        target_user_id: target.user_id,
      });
    }

    setResults((prev) => prev.filter((r) => r.id !== target.id));
    setConfirmingDelete(null);
    router.refresh();
  }

  async function confirmClearAll() {
    const ids = results.map((r) => r.id);
    if (ids.length === 0) return;
    setClearingAll(true);
    const { error } = await supabase.from("interaction_results").delete().in("id", ids);
    setClearingAll(false);
    if (error) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAdminAction(supabase, user.id, "alert_clear_all", "interaction_results", null, {
        count: ids.length,
        ids,
      });
    }

    setResults([]);
    setConfirmingClearAll(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {canDelete && results.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmingClearAll(true)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-semibold text-danger-500 hover:bg-danger-050"
          >
            <ListX size={14} /> Clear All
          </button>
        </div>
      )}
      {results.length === 0 && <Card className="text-bodym text-ink-500">{noHighSeverityLabel}</Card>}
      {results.map((r) => {
        const encounteredBy = usersById.get(r.user_id);
        return (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-h3 font-bold text-ink-900">{r.medication_names.join(" + ")}</p>
                <p className="text-caption text-ink-500">{r.summary}</p>
                <p className="mt-1 text-caption text-ink-500">{new Date(r.checked_at).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="danger">{severityLabel}</Badge>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(r)}
                    className="rounded-md p-1.5 text-danger-500 hover:bg-danger-050"
                    title="Delete alert"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-ink-100 pt-3">
              {encounteredBy ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-bodys font-semibold text-ink-900">{encounteredBy.full_name || "—"}</p>
                    <p className="text-caption text-ink-500">{encounteredBy.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${encounteredBy.email}`}
                      className="flex items-center gap-1 rounded-md bg-primary-050 px-3 py-1.5 text-caption font-semibold text-primary-900"
                    >
                      <Mail size={14} /> Email
                    </a>
                    {encounteredBy.phone_number && (
                      <a
                        href={`tel:${encounteredBy.phone_number}`}
                        className="flex items-center gap-1 rounded-md bg-primary-050 px-3 py-1.5 text-caption font-semibold text-primary-900"
                      >
                        <Phone size={14} /> Call
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-caption text-ink-500">User no longer available.</p>
              )}
            </div>
          </Card>
        );
      })}

      <Modal open={!!confirmingDelete} onClose={() => setConfirmingDelete(null)} title="Delete alert?">
        {confirmingDelete && (
          <div>
            <p className="mb-4 text-bodym text-ink-700">
              Delete the high-severity alert for{" "}
              <span className="font-semibold">{confirmingDelete.medication_names.join(" + ")}</span>? This only
              removes it from the log — it doesn&apos;t undo the interaction check itself.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="md" onClick={() => setConfirmingDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={confirmingClearAll} onClose={() => setConfirmingClearAll(false)} title="Clear all alerts?">
        <div>
          <p className="mb-4 text-bodym text-ink-700">
            Delete all <span className="font-semibold">{results.length}</span> high-severity alerts shown here? This
            only removes them from the log — it doesn&apos;t undo the interaction checks themselves.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => setConfirmingClearAll(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={confirmClearAll} disabled={clearingAll}>
              {clearingAll ? "Clearing…" : "Clear All"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
