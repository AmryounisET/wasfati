"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Grid3x3, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { interpolate } from "@/lib/i18n/get-dictionary";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function DisplayModeForm({ initialSeniorMode }: { initialSeniorMode: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();
  const [senior, setSenior] = useState(initialSeniorMode);
  const [saving, setSaving] = useState(false);

  const modes = [
    {
      value: false,
      icon: Grid3x3,
      title: t.displayMode.standardTitle,
      subtitle: t.displayMode.standardSubtitle,
      description: t.displayMode.standardDesc,
      stats: ["4.5:1", "48dp", "14sp"],
    },
    {
      value: true,
      icon: Sun,
      title: t.displayMode.seniorTitle,
      subtitle: t.displayMode.seniorSubtitle,
      description: t.displayMode.seniorDesc,
      stats: ["7:1+", "56dp", "18sp"],
    },
  ];

  async function save() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ senior_friendly_mode: senior }).eq("id", user.id);
    }
    document.documentElement.setAttribute("data-senior-mode", String(senior));
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {modes.map((mode) => {
        const active = mode.value === senior;
        return (
          <button
            key={String(mode.value)}
            type="button"
            onClick={() => setSenior(mode.value)}
            className={cn(
              "w-full rounded-lg border p-4 text-start",
              active ? "border-primary-500 bg-primary-050" : "border-ink-100",
            )}
          >
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-100 text-primary-900">
                <mode.icon size={20} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-h3 font-bold text-ink-900">{mode.title}</p>
                  {active && <Badge variant="success">{t.displayMode.activeBadge}</Badge>}
                </div>
                <p className="text-caption text-ink-500">{mode.subtitle}</p>
              </div>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-primary-900" : "border-ink-300",
                )}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-primary-900" />}
              </span>
            </div>
            <p className="mb-3 text-bodys text-ink-700">{mode.description}</p>
            <div className="flex flex-wrap gap-2">
              {mode.stats.map((s) => (
                <span key={s} className="rounded-pill bg-primary-100 px-2 py-1 text-caption text-primary-900">
                  {s}
                </span>
              ))}
            </div>
          </button>
        );
      })}

      <div className="rounded-md bg-primary-050 p-3 text-caption text-primary-900">
        {interpolate(t.displayMode.previewNote, {
          mode: senior ? t.displayMode.previewSenior : t.displayMode.previewStandard,
        })}
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? t.displayMode.saving : t.displayMode.save}
      </Button>
    </div>
  );
}
