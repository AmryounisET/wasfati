"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, FileDown, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { INTL_TAG } from "@/lib/i18n/locales";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { getDisplaySummary } from "@/lib/interaction-display";
import type { DoseLog, InteractionResult, Medication, Severity, UserType } from "@/lib/supabase/types";

const severityVariant: Record<Severity, "danger" | "warning" | "primary" | "neutral"> = {
  high: "danger",
  moderate: "warning",
  low: "primary",
  unverified: "neutral",
};

export function HistoryClient({
  results,
  doseLogs,
  medications,
  userType,
}: {
  results: InteractionResult[];
  doseLogs: DoseLog[];
  medications: Medication[];
  userType: UserType;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<"checks" | "doses">("checks");
  const [rechecking, setRechecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const medById = useMemo(() => new Map(medications.map((m) => [m.id, m])), [medications]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(INTL_TAG[locale], { year: "numeric", month: "long", day: "numeric" });
  }
  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(INTL_TAG[locale], { hour: "2-digit", minute: "2-digit" });
  }

  async function recheck() {
    setRechecking(true);
    setError(null);
    const activeIds = medications.filter((m) => !m.archived).map((m) => m.id);
    if (activeIds.length === 0) {
      setError(t.history.noActiveMeds);
      setRechecking(false);
      return;
    }
    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-interactions", {
        body: { medication_ids: activeIds },
      });
      if (fnError) throw fnError;
      const ids = ((data as { id: string }[] | null) ?? []).map((r) => r.id);
      if (ids.length > 0) {
        router.push(`/safety-result?ids=${ids.join(",")}`);
      } else {
        router.refresh();
      }
    } catch {
      setError(t.history.engineUnavailable);
    } finally {
      setRechecking(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button size="md" onClick={recheck} disabled={rechecking} className="flex-1">
          <RefreshCw size={16} className={rechecking ? "animate-spin" : undefined} />
          {rechecking ? t.history.rechecking : t.history.recheck}
        </Button>
        <Link
          href="/medications/history/report"
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-100 text-button font-semibold text-primary-900"
        >
          <FileDown size={16} />
          {t.history.exportReport}
        </Link>
      </div>

      {error && <p className="mb-4 text-bodys text-danger-500">{error}</p>}

      <SegmentedControl
        className="mb-4"
        value={tab}
        onChange={(v) => setTab(v as "checks" | "doses")}
        options={[
          { value: "checks", label: t.history.tabChecks },
          { value: "doses", label: t.history.tabDoses },
        ]}
      />

      {tab === "checks" && (
        <div className="space-y-3">
          {results.length === 0 && (
            <Card className="text-center text-bodym text-ink-500">{t.history.emptyChecks}</Card>
          )}
          {results.map((r) => (
            <Link key={r.id} href={`/safety-result?ids=${r.id}`}>
              <Card>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-h3 font-bold text-ink-900">{r.medication_names.join(" + ")}</p>
                  <Badge variant={severityVariant[r.severity]}>{t.severity[r.severity]}</Badge>
                </div>
                <p className="mb-1 text-bodys text-ink-700">{getDisplaySummary(r, userType, t)}</p>
                <p className="text-caption text-ink-500">
                  {formatDate(r.checked_at)} · {formatTime(r.checked_at)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {tab === "doses" && (
        <div className="space-y-3">
          {doseLogs.length === 0 && (
            <Card className="text-center text-bodym text-ink-500">{t.history.emptyDoses}</Card>
          )}
          {doseLogs.map((log) => {
            const med = medById.get(log.medication_id);
            return (
              <Card key={log.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-h3 font-bold text-ink-900">{med?.name ?? t.history.deletedMedicine}</p>
                  <p className="text-caption text-ink-500">
                    {log.confirmed_at && `${formatDate(log.confirmed_at)} · ${formatTime(log.confirmed_at)}`}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-success-700">
                  <Check size={16} />
                  <span className="text-bodys font-medium">{t.history.confirmedLabel}</span>
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
