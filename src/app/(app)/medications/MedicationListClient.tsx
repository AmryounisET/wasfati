"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { interpolate } from "@/lib/i18n/get-dictionary";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Badge } from "@/components/ui/Badge";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import type { Medication } from "@/lib/supabase/types";

type Filter = "all" | "active" | "low_stock" | "archived";

function filterMeds(list: Medication[], filter: Filter) {
  switch (filter) {
    case "active":
      return list.filter((m) => !m.archived);
    case "low_stock":
      return list.filter((m) => m.low_stock && !m.archived);
    case "archived":
      return list.filter((m) => m.archived);
    default:
      return list;
  }
}

export function MedicationListClient({
  medications,
  relativeGroups,
}: {
  medications: Medication[];
  relativeGroups: { ownerId: string; ownerName: string; medications: Medication[] }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState(medications);
  const [confirmingDelete, setConfirmingDelete] = useState<Medication | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterOptions: { value: Filter; label: string }[] = [
    { value: "all", label: t.medications.filterAll },
    { value: "active", label: t.medications.filterActive },
    { value: "low_stock", label: t.medications.filterLowStock },
    { value: "archived", label: t.medications.filterArchived },
  ];

  const filtered = useMemo(() => filterMeds(items, filter), [items, filter]);
  const hasRelatives = relativeGroups.length > 0;

  async function renewStock(id: string) {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, low_stock: false } : m)));
    await supabase.from("medications").update({ low_stock: false }).eq("id", id);
  }

  async function confirmDelete() {
    if (!confirmingDelete) return;
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase.from("medications").delete().eq("id", confirmingDelete.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== confirmingDelete.id));
    setConfirmingDelete(null);
    router.refresh();
  }

  return (
    <div>
      <ChoiceChips
        className="mb-4"
        options={filterOptions}
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
      />

      {hasRelatives && (
        <h2 className="mb-2 flex items-center gap-1.5 text-h3 font-bold text-ink-900">
          {t.medications.myMedicationsSection}
        </h2>
      )}

      {filtered.length === 0 && (
        <Card className="text-center text-bodym text-ink-500">{t.medications.emptyCategory}</Card>
      )}

      <div className="space-y-3">
        {filtered.map((m) => (
          <Card key={m.id} className={m.low_stock ? "border-warning-100" : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IconChip category={m.category} />
                <div>
                  <p className="text-h3 font-bold text-ink-900">
                    {m.name} {m.dose}
                  </p>
                  <p className="text-caption text-ink-500">{m.generic_name}</p>
                </div>
              </div>
              {m.low_stock && <Badge variant="warning">⚠ {t.medications.lowStockBadge}</Badge>}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/medications/${m.id}/edit`)}
                className="rounded-md bg-primary-050 px-3 py-1.5 text-bodys font-medium text-primary-900"
              >
                ✎ {t.common.edit}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(m)}
                aria-label={t.common.delete}
                className="rounded-md bg-danger-050 p-2 text-danger-500"
              >
                <Trash2 size={16} />
              </button>
              {m.low_stock && (
                <button
                  type="button"
                  onClick={() => renewStock(m.id)}
                  className="rounded-md bg-success-100 px-3 py-1.5 text-bodys font-medium text-success-700"
                >
                  ⟳ {t.medications.renewStock}
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {relativeGroups.map((group) => {
        const groupFiltered = filterMeds(group.medications, filter);
        return (
          <div key={group.ownerId} className="mt-6 border-t-2 border-dashed border-ink-100 pt-5">
            <h2 className="mb-2 flex items-center gap-1.5 text-h3 font-bold text-ink-900">
              <Users size={16} className="text-primary-700" />
              {interpolate(t.medications.relativeMedicationsSection, { name: group.ownerName || t.account.defaultUser })}
            </h2>

            {groupFiltered.length === 0 ? (
              <Card className="text-center text-bodym text-ink-500">{t.medications.emptyCategory}</Card>
            ) : (
              <div className="space-y-3">
                {groupFiltered.map((m) => (
                  <Card key={m.id} className={m.low_stock ? "border-warning-100" : undefined}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <IconChip category={m.category} />
                        <div>
                          <p className="text-h3 font-bold text-ink-900">
                            {m.name} {m.dose}
                          </p>
                          <p className="text-caption text-ink-500">{m.generic_name}</p>
                        </div>
                      </div>
                      {m.low_stock && <Badge variant="warning">⚠ {t.medications.lowStockBadge}</Badge>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Sheet open={!!confirmingDelete} onClose={() => setConfirmingDelete(null)} title={t.medications.deleteButton}>
        {confirmingDelete && (
          <div>
            <p className="mb-4 text-center text-bodym text-ink-700">{t.medications.deleteConfirm}</p>
            {error && <p className="mb-4 text-center text-bodys text-danger-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={() => setConfirmingDelete(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" size="lg" onClick={confirmDelete} disabled={deleting}>
                {deleting ? t.common.saving : t.common.delete}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
