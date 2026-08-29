"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { TextField, TextAreaField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import type { Medication } from "@/lib/supabase/types";

export function EditMedicationForm({ medication }: { medication: Medication }) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [name, setName] = useState(medication.name);
  const [dose, setDose] = useState(medication.dose);
  const [frequency, setFrequency] = useState(medication.frequency);
  const [notes, setNotes] = useState(medication.notes ?? "");
  const [archived, setArchived] = useState(medication.archived);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase
      .from("medications")
      .update({ name, dose, frequency, notes: notes || null, archived })
      .eq("id", medication.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.push("/medications");
    router.refresh();
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase.from("medications").delete().eq("id", medication.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/medications");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <TextField label={t.addMedicine.nameLabel} value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label={t.addMedicine.doseLabel} value={dose} onChange={(e) => setDose(e.target.value)} />
      <TextField
        label={t.addMedicine.frequencyLabel}
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
      />
      <TextAreaField label={t.addMedicine.notesLabel} value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button
        type="button"
        onClick={() => setArchived((v) => !v)}
        className="w-full rounded-md border border-ink-300 py-3 text-bodym font-medium text-ink-700"
      >
        {archived ? t.medications.unarchiveButton : t.medications.archiveButton}
      </button>

      {error && <p className="text-bodys text-danger-500">{error}</p>}

      <Button onClick={save} disabled={saving}>
        {saving ? t.common.saving : t.medications.saveChanges}
      </Button>

      {confirmingDelete ? (
        <div className="space-y-2 rounded-md border border-danger-100 bg-danger-050 p-3">
          <p className="text-bodys font-medium text-danger-700">{t.medications.deleteConfirm}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="flex-1 rounded-md border border-ink-300 py-2 text-bodys font-medium text-ink-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="flex-1 rounded-md bg-danger-500 py-2 text-bodys font-semibold text-white"
            >
              {deleting ? t.common.saving : t.medications.deleteButton}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="w-full py-2 text-bodym font-semibold text-danger-500"
        >
          {t.medications.deleteButton}
        </button>
      )}
    </div>
  );
}
