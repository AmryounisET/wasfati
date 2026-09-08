"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { TextField, TextAreaField } from "@/components/ui/TextField";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { interpolate } from "@/lib/i18n/get-dictionary";
import type { InteractionResult, MedicationSource, Severity } from "@/lib/supabase/types";

const VALID_SOURCES: MedicationSource[] = ["manual", "search", "scan", "prescription_ocr"];

const severityVariant: Record<Severity, "danger" | "warning" | "primary" | "neutral"> = {
  high: "danger",
  moderate: "warning",
  low: "primary",
  unverified: "neutral",
};

// Canonical values stored in the DB stay Arabic regardless of UI language —
// src/lib/dose-schedule.ts matches on these exact keywords to compute
// missed-dose state, and existing rows already use them. Only the chip
// LABEL shown to the user is translated.
const FREQUENCY_VALUES = ["يومياً", "مرتين يومياً", "ثلاث مرات", "أربع مرات", "عند الحاجة"] as const;
const TIME_OF_DAY_VALUES = ["صباحاً", "ظهراً", "مساء", "قبل النوم"] as const;

// How many times-of-day the patient must pick for each frequency — "twice
// daily" needs exactly 2 picks, "three times" needs 3, and so on, so the
// selected slots always match what was actually prescribed. "As needed"
// has no fixed daily count, so it stays a single pick like "once daily".
const FREQUENCY_INTAKE_COUNT: Record<string, number> = {
  "يومياً": 1,
  "مرتين يومياً": 2,
  "ثلاث مرات": 3,
  "أربع مرات": 4,
  "عند الحاجة": 1,
};

const unitOptions = ["mg", "ml", "g", "mcg", "IU"];

export default function ManualEntryPage() {
  return (
    <Suspense>
      <ManualEntryForm />
    </Suspense>
  );
}

function ManualEntryForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const frequencyOptions = [
    { value: FREQUENCY_VALUES[0], label: t.addMedicine.freqDaily },
    { value: FREQUENCY_VALUES[1], label: t.addMedicine.freqTwiceDaily },
    { value: FREQUENCY_VALUES[2], label: t.addMedicine.freqThreeTimes },
    { value: FREQUENCY_VALUES[3], label: t.addMedicine.freqFourTimes },
    { value: FREQUENCY_VALUES[4], label: t.addMedicine.freqAsNeeded },
  ];
  const timeOfDayOptions = [
    { value: TIME_OF_DAY_VALUES[0], label: t.addMedicine.timeMorning },
    { value: TIME_OF_DAY_VALUES[1], label: t.addMedicine.timeNoon },
    { value: TIME_OF_DAY_VALUES[2], label: t.addMedicine.timeEvening },
    { value: TIME_OF_DAY_VALUES[3], label: t.addMedicine.timeBeforeSleep },
  ];

  const prefillDoseMatch = searchParams.get("dose")?.match(/([\d.]+)\s*([a-zA-Z]+)/);

  const [name, setName] = useState(searchParams.get("name") ?? "");
  const prefilledGeneric = searchParams.get("generic");
  const [unit, setUnit] = useState(prefillDoseMatch?.[2] ?? "mg");
  const [dose, setDose] = useState(prefillDoseMatch?.[1] ?? "");
  const [category] = useState(searchParams.get("category") ?? "other");
  const [frequency, setFrequencyState] = useState<string>(FREQUENCY_VALUES[0]);
  const [timeOfDay, setTimeOfDay] = useState<string[]>([TIME_OF_DAY_VALUES[0]]);
  const requiredTimeCount = FREQUENCY_INTAKE_COUNT[frequency] ?? 1;
  const intervalHours = requiredTimeCount > 1 ? Math.round(24 / requiredTimeCount) : null;

  function handleFrequencyChange(next: string) {
    setFrequencyState(next);
    // The required number of picks changes with frequency, so a stale
    // selection from a different frequency would be the wrong count —
    // clearing it forces a fresh, correctly-sized pick.
    setTimeOfDay([]);
  }

  function toggleTimeOfDay(v: string) {
    setTimeOfDay((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      if (requiredTimeCount === 1) return [v];
      if (prev.length >= requiredTimeCount) return prev;
      return [...prev, v];
    });
  }
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState(searchParams.get("notes") ?? "");
  const prefilledSourceParam = searchParams.get("source");
  const prefilledSource: MedicationSource = VALID_SOURCES.includes(prefilledSourceParam as MedicationSource)
    ? (prefilledSourceParam as MedicationSource)
    : "manual";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResults, setPendingResults] = useState<InteractionResult[] | null>(null);
  const [pendingMedId, setPendingMedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const canSubmit = name.trim().length > 1 && dose.trim().length > 0 && timeOfDay.length === requiredTimeCount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t.addMedicine.reloginError);
      setSubmitting(false);
      return;
    }

    // Keep the selected times in the same order they occur in the day
    // (not selection order) — src/lib/dose-schedule.ts's missed-dose check
    // matches the first of these keywords it finds, which only lines up
    // with "the earliest dose of the day" if they're stored chronologically.
    const orderedTimeOfDay = TIME_OF_DAY_VALUES.filter((v) => timeOfDay.includes(v));
    const frequencyText = [frequency, orderedTimeOfDay.join("، "), notes.trim() ? `• ${notes.trim()}` : null]
      .filter(Boolean)
      .join(" • ");

    const { data: newMed, error: insertError } = await supabase
      .from("medications")
      .insert({
        user_id: user.id,
        name: name.trim(),
        generic_name:
          prefilledGeneric && name.trim() === (searchParams.get("name") ?? "").trim()
            ? prefilledGeneric.trim().toLowerCase()
            : name.trim().toLowerCase(),
        dose: `${dose}${unit}`,
        frequency: frequencyText,
        category,
        notes: notes.trim() || null,
        source: prefilledSource,
      })
      .select()
      .single();

    if (insertError || !newMed) {
      setError(insertError?.message ?? t.addMedicine.saveError);
      setSubmitting(false);
      return;
    }

    try {
      // Only the newly-added medicine is sent — the Edge Function checks it
      // against the rest of the active list itself, without re-flagging
      // pairs that don't involve it (see check-interactions for why: doing
      // a full-list check on every add re-inserts fresh log rows for
      // already-known pairs and makes admin-cleared alerts look like they
      // silently come back).
      const { data: results, error: fnError } = await supabase.functions.invoke(
        "check-interactions",
        { body: { medication_ids: [newMed.id] } },
      );
      if (fnError) throw fnError;

      const found = (results as InteractionResult[] | null) ?? [];
      if (found.length > 0) {
        // Hold off on confirming the add — the medicine is already saved
        // (the check needs a real row to check against), but the user
        // gets to decide whether to keep it or roll the save back before
        // they ever see it appear in their list.
        setPendingResults(found);
        setPendingMedId(newMed.id);
        setSubmitting(false);
        return;
      }
      router.push(`/medications?added=${newMed.id}`);
    } catch {
      // Interaction engine (Edge Function) not reachable yet in this
      // environment — the medication is still saved; surface that plainly
      // rather than blocking the save.
      router.push(`/medications?added=${newMed.id}&safetyCheckFailed=1`);
    }
  }

  function keepMedicine() {
    if (!pendingMedId || !pendingResults) return;
    const ids = pendingResults.map((r) => r.id);
    router.push(`/safety-result?ids=${ids.join(",")}&medicationId=${pendingMedId}`);
  }

  async function cancelMedicine() {
    if (!pendingMedId) return;
    setCancelling(true);
    await supabase.from("medications").delete().eq("id", pendingMedId);
    setCancelling(false);
    setPendingResults(null);
    setPendingMedId(null);
  }

  return (
    <Screen>
      <PageHeader title={t.addMedicine.manualTitle} closeButton onBack={() => router.push("/medications")} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          label={t.addMedicine.nameLabel}
          labelEn={t.addMedicine.nameLabelEn}
          required
          placeholder={t.addMedicine.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-bodym font-semibold text-ink-900">
              {t.addMedicine.doseLabel} <span className="text-danger-500">*</span>
            </span>
            <span className="text-caption text-ink-500">{t.addMedicine.doseLabelEn}</span>
          </div>
          <div className="flex gap-2">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-12 rounded-md border border-ink-300 bg-surface-card px-3 text-bodyl text-ink-900"
            >
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <TextField
              className="flex-1"
              placeholder={t.addMedicine.dosePlaceholder}
              inputMode="numeric"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-bodym font-semibold text-ink-900">{t.addMedicine.frequencyLabel}</span>
            <span className="text-caption text-ink-500">{t.addMedicine.frequencyLabelEn}</span>
          </div>
          <ChoiceChips options={frequencyOptions} value={frequency} onChange={handleFrequencyChange} />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-bodym font-semibold text-ink-900">{t.addMedicine.timeOfDayLabel}</span>
            <span className="text-caption text-ink-500">{t.addMedicine.timeOfDayLabelEn}</span>
          </div>
          {requiredTimeCount > 1 && (
            <p className="mb-2 text-caption text-primary-700">
              {interpolate(t.addMedicine.timeOfDayIntervalHint, { hours: intervalHours ?? "" })}
              {" — "}
              {interpolate(t.addMedicine.timeOfDaySelectedCount, {
                selected: timeOfDay.length,
                required: requiredTimeCount,
              })}
            </p>
          )}
          <ChoiceChips options={timeOfDayOptions} value={timeOfDay} onChange={toggleTimeOfDay} />
        </div>

        <TextField
          label={t.addMedicine.durationLabel}
          labelEn={t.addMedicine.durationLabelEn}
          inputMode="numeric"
          placeholder={t.addMedicine.durationPlaceholder}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <TextAreaField
          label={t.addMedicine.notesLabel}
          labelEn={t.addMedicine.notesLabelEn}
          placeholder={t.addMedicine.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-bodys text-danger-500">{error}</p>}

        <Button type="submit" disabled={!canSubmit || submitting}>
          {submitting ? t.addMedicine.submitting : t.addMedicine.submitButton}
        </Button>
      </form>

      <Sheet
        open={!!pendingResults}
        onClose={cancelMedicine}
        title={t.addMedicine.interactionAlertTitle}
      >
        {pendingResults && (
          <div>
            <div className="mb-4 flex items-start gap-2 rounded-md bg-warning-050 p-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-warning-700" size={18} />
              <p className="text-bodys text-warning-700">{t.addMedicine.interactionAlertBody}</p>
            </div>

            <div className="mb-5 space-y-2">
              {pendingResults.map((r) => (
                <div key={r.id} className="rounded-md border border-ink-100 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-bodym font-bold text-ink-900">{r.medication_names.join(" + ")}</p>
                    <Badge variant={severityVariant[r.severity]}>{t.severity[r.severity]}</Badge>
                  </div>
                  <p className="text-bodys text-ink-700">{r.summary}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Button variant="danger" onClick={keepMedicine}>
                {t.addMedicine.addAnywayButton}
              </Button>
              <Button variant="outline" onClick={cancelMedicine} disabled={cancelling}>
                {cancelling ? t.common.saving : t.common.cancel}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
