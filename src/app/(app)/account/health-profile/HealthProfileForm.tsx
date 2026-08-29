"use client";

import { useState } from "react";
import { UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { interpolate, type Dictionary } from "@/lib/i18n/get-dictionary";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import type { Profile, Sex } from "@/lib/supabase/types";

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  tone = "danger",
  t,
}: {
  label: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  tone?: "danger" | "primary";
  t: Dictionary;
}) {
  const [value, setValue] = useState("");
  const chipClass =
    tone === "danger" ? "bg-danger-100 text-danger-700" : "bg-primary-100 text-primary-900";

  return (
    <div className="rounded-lg border border-ink-100 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-h3 font-bold text-ink-900">{label}</p>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className={`flex items-center gap-1 rounded-pill px-3 py-1 text-bodys ${chipClass}`}>
            {tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              aria-label={interpolate(t.healthProfile.removeAriaLabel, { item: tag })}
            >
              <X size={13} />
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-caption text-ink-500">{t.healthProfile.noneLabel}</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.healthProfile.addItemPlaceholder}
          className="h-9 flex-1 rounded-md border border-ink-300 px-3 text-bodys focus:border-primary-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              e.preventDefault();
              onAdd(value.trim());
              setValue("");
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (value.trim()) {
              onAdd(value.trim());
              setValue("");
            }
          }}
          className="rounded-md bg-primary-050 px-3 text-bodys font-semibold text-primary-900"
        >
          + {t.healthProfile.addButton}
        </button>
      </div>
    </div>
  );
}

export function HealthProfileForm({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const { t } = useTranslation();
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [bloodType, setBloodType] = useState(profile.blood_type ?? "");
  const [allergies, setAllergies] = useState(profile.allergies);
  const [chronicConditions, setChronicConditions] = useState(profile.chronic_conditions);
  const [isPregnant, setIsPregnant] = useState(profile.is_pregnant ?? false);
  const [isBreastfeeding, setIsBreastfeeding] = useState(profile.is_breastfeeding ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        sex,
        age: age ? Number(age) : null,
        blood_type: bloodType || null,
        allergies,
        chronic_conditions: chronicConditions,
        is_pregnant: sex === "female" ? isPregnant : null,
        is_breastfeeding: sex === "female" ? isBreastfeeding : null,
      })
      .eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const sexLabel = sex === "female" ? t.healthProfile.female : sex === "male" ? t.healthProfile.male : t.healthProfile.unknownDash;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-primary-100 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-900 text-white">
          <UserRound size={20} />
        </span>
        <p className="text-bodys text-primary-900">
          {sexLabel} · {age || t.healthProfile.unknownDash} {t.healthProfile.yearsUnit} · {t.healthProfile.bloodTypeLabel}:{" "}
          {bloodType || t.healthProfile.unknownDash}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-bodym font-semibold text-ink-900">{t.healthProfile.sexLabel}</label>
          <select
            value={sex ?? ""}
            onChange={(e) => setSex((e.target.value || null) as Sex | null)}
            className="h-12 w-full rounded-md border border-ink-300 bg-surface-card px-3 text-bodyl"
          >
            <option value="">{t.healthProfile.unknownDash}</option>
            <option value="male">{t.healthProfile.male}</option>
            <option value="female">{t.healthProfile.female}</option>
          </select>
        </div>
        <TextField
          label={t.healthProfile.ageLabel}
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </div>

      <TextField
        label={t.healthProfile.bloodTypeLabel}
        placeholder={t.healthProfile.bloodTypePlaceholder}
        value={bloodType}
        onChange={(e) => setBloodType(e.target.value)}
      />

      {sex === "female" && (
        <div className="space-y-3 rounded-lg border border-ink-100 p-4">
          <Toggle checked={isPregnant} onChange={setIsPregnant} label={t.healthProfile.pregnantLabel} />
          <Toggle checked={isBreastfeeding} onChange={setIsBreastfeeding} label={t.healthProfile.breastfeedingLabel} />
        </div>
      )}

      <TagInput
        label={t.healthProfile.allergiesLabel}
        tags={allergies}
        onAdd={(v) => setAllergies((prev) => [...prev, v])}
        onRemove={(v) => setAllergies((prev) => prev.filter((tag) => tag !== v))}
        tone="danger"
        t={t}
      />

      <TagInput
        label={t.healthProfile.chronicConditionsLabel}
        tags={chronicConditions}
        onAdd={(v) => setChronicConditions((prev) => [...prev, v])}
        onRemove={(v) => setChronicConditions((prev) => prev.filter((tag) => tag !== v))}
        tone="primary"
        t={t}
      />

      <Button onClick={save} disabled={saving}>
        {saving ? t.common.saving : saved ? t.common.saved : t.healthProfile.saveButton}
      </Button>
    </div>
  );
}
