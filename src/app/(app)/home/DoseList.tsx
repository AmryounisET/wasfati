"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Medication } from "@/lib/supabase/types";

export function DoseList({
  medications,
  confirmedIds,
}: {
  medications: Medication[];
  confirmedIds: string[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(new Set(confirmedIds));
  const [pending, setPending] = useState<string | null>(null);

  async function confirmDose(medicationId: string, userId: string) {
    setPending(medicationId);
    const now = new Date().toISOString();
    try {
      const { error } = await supabase.from("dose_logs").insert({
        user_id: userId,
        medication_id: medicationId,
        scheduled_at: now,
        confirmed_at: now,
      });
      if (!error) {
        setConfirmed((prev) => new Set(prev).add(medicationId));
        // The missed-dose banner above is computed server-side in
        // home/page.tsx — refresh so it re-evaluates and drops this
        // medication now that it's confirmed.
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  }

  if (medications.length === 0) {
    return (
      <Card className="text-center text-bodym text-ink-500">{t.home.emptyMeds}</Card>
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((m) => {
        const done = confirmed.has(m.id);
        return (
          <Card key={m.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconChip category={m.category} />
              <div className="min-w-0">
                <p className="text-h3 font-bold text-ink-900">{m.name}</p>
                <p className="break-words text-caption text-ink-500">
                  {m.generic_name} {m.dose}
                </p>
                <p className="text-caption text-ink-500">{m.frequency}</p>
              </div>
            </div>
            <Button
              size="md"
              variant="primary"
              disabled={done || pending === m.id}
              onClick={() => confirmDose(m.id, m.user_id)}
              className={cn(
                "w-auto shrink-0 px-4 disabled:text-white disabled:opacity-100",
                done ? "disabled:bg-success-700" : "disabled:bg-primary-700",
              )}
            >
              {done && <Check size={16} />}
              {done ? t.home.confirmed : t.home.confirmDose}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
