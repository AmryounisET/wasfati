"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/locales";

export function LanguageForm() {
  const supabase = createClient();
  const { locale, t, setLocale } = useTranslation();
  const [selected, setSelected] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ language_code: selected }).eq("id", user.id);
    }
    setLocale(selected);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {LOCALES.map((code) => {
          const active = code === selected;
          const names = LOCALE_NAMES[code];
          return (
            <button
              key={code}
              type="button"
              onClick={() => setSelected(code)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border p-4",
                active ? "border-primary-500 bg-primary-050" : "border-ink-100",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  active ? "border-primary-900" : "border-ink-300",
                )}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-primary-900" />}
              </span>
              <span>
                <span className="block text-h3 font-bold text-ink-900">{names.native}</span>
                <span className="block text-caption text-ink-500">{names.english}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Banner variant="info">{t.language.note}</Banner>

      <Button
        onClick={save}
        disabled={saving}
        className="disabled:bg-primary-700 disabled:text-white disabled:opacity-90"
      >
        {saving ? t.language.saving : t.language.save}
      </Button>
    </div>
  );
}
