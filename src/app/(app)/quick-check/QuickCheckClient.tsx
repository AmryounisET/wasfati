"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileText, PenLine, X, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { extractFunctionError } from "@/lib/edge-function-error";
import { getQuickCheckQueue, setQuickCheckQueue, clearQuickCheckQueue } from "@/lib/quick-check-queue";
import { getDisplaySummary } from "@/lib/interaction-display";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { interpolate, type Dictionary } from "@/lib/i18n/get-dictionary";
import { cn } from "@/lib/utils";
import { Screen } from "@/components/layout/Screen";
import { PageHeader } from "@/components/layout/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { QuickCheckPair, Severity } from "@/lib/supabase/types";

const severityVariant: Record<Severity, "danger" | "warning" | "primary" | "neutral"> = {
  high: "danger",
  moderate: "warning",
  low: "primary",
  unverified: "neutral",
};
const severityCardClass: Record<Severity, string> = {
  high: "border-danger-100 bg-danger-050",
  moderate: "border-warning-100 bg-warning-050",
  low: "border-primary-100 bg-primary-050",
  unverified: "border-ink-100 bg-surface-card",
};
const severityTextClass: Record<Severity, string> = {
  high: "text-danger-700",
  moderate: "text-warning-700",
  low: "text-primary-900",
  unverified: "text-ink-900",
};
const severityRank: Record<Severity, number> = { high: 3, moderate: 2, low: 1, unverified: 0 };

function severityLabel(s: Severity, t: Dictionary): string {
  if (s === "high") return t.quickCheck.severityMajor;
  if (s === "moderate") return t.quickCheck.severityModerate;
  if (s === "low") return t.quickCheck.severityMinor;
  return t.severity.unverified;
}
function severityTitle(s: Severity, t: Dictionary): string {
  if (s === "high") return t.quickCheck.pairTitleMajor;
  if (s === "moderate") return t.quickCheck.pairTitleModerate;
  return t.quickCheck.pairTitleMinor;
}

export function QuickCheckClient() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [step, setStep] = useState<"chooser" | "queue" | "result">("chooser");
  const [queue, setQueue] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<QuickCheckPair[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);

  useEffect(() => {
    const existing = getQuickCheckQueue();
    if (existing.length > 0) {
      // One-time read of sessionStorage on mount (returning from the scan/
      // upload sub-pages) — no derivable dependency, no user event to hook
      // this off of instead.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQueue(existing);
      setStep("queue");
    }
  }, []);

  function addTyped() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (queue.some((q) => q.toLowerCase() === trimmed.toLowerCase())) {
      setInput("");
      return;
    }
    const next = [...queue, trimmed];
    setQueue(next);
    setQuickCheckQueue(next);
    setInput("");
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTyped();
    }
  }

  function removeItem(name: string) {
    const next = queue.filter((q) => q !== name);
    setQueue(next);
    setQuickCheckQueue(next);
  }

  async function runCheck() {
    if (queue.length === 0) return;
    setChecking(true);
    setCheckError(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-interactions", {
        body: { trade_names: queue },
      });
      if (error || !data || data.error) {
        setCheckError(data?.error ?? (await extractFunctionError(error, t.quickCheck.checkError)));
        return;
      }
      setPairs((data.pairs as QuickCheckPair[]) ?? []);
      setUnresolved((data.unresolved as string[]) ?? []);
      clearQuickCheckQueue();
      setStep("result");
    } catch {
      setCheckError(t.quickCheck.checkError);
    } finally {
      setChecking(false);
    }
  }

  function startOver() {
    setQueue([]);
    setInput("");
    setPairs([]);
    setUnresolved([]);
    setCheckError(null);
    clearQuickCheckQueue();
    setStep("chooser");
  }

  const worstFirst = [...pairs].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  return (
    <>
      <Sheet open={step === "chooser"} onClose={() => router.push("/home")} title={t.quickCheck.chooserTitle}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push("/quick-check/scan")}
            className="flex w-full items-center gap-3 rounded-md border border-ink-100 p-4 text-start hover:bg-primary-050"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-100 text-ink-700">
              <Camera size={20} />
            </span>
            <span>
              <span className="block text-h3 font-bold text-ink-900">{t.quickCheck.chooserScanTitle}</span>
              <span className="block text-caption text-ink-500">{t.quickCheck.chooserScanSubtitle}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/quick-check/upload")}
            className="flex w-full items-center gap-3 rounded-md border border-ink-100 p-4 text-start hover:bg-primary-050"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-100 text-ink-700">
              <FileText size={20} />
            </span>
            <span>
              <span className="block text-h3 font-bold text-ink-900">{t.quickCheck.chooserUploadTitle}</span>
              <span className="block text-caption text-ink-500">{t.quickCheck.chooserUploadSubtitle}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStep("queue")}
            className="flex w-full items-center gap-3 rounded-md border border-ink-100 p-4 text-start hover:bg-primary-050"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-100 text-ink-700">
              <PenLine size={20} />
            </span>
            <span>
              <span className="block text-h3 font-bold text-ink-900">{t.quickCheck.chooserTypeTitle}</span>
              <span className="block text-caption text-ink-500">{t.quickCheck.chooserTypeSubtitle}</span>
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-4 w-full text-center text-bodym text-ink-500"
        >
          {t.quickCheck.chooserCancel}
        </button>
      </Sheet>

      {step === "queue" && (
        <Screen>
          <PageHeader title={t.quickCheck.queueTitle} onBack={() => router.push("/home")} />
          <p className="mb-5 text-bodys text-ink-500">{t.quickCheck.queueSubtitle}</p>

          <TextField
            label={t.quickCheck.queueInputLabel}
            placeholder={t.quickCheck.queueInputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <Button
            size="md"
            variant="secondary"
            className="mt-2 mb-6 w-auto self-start px-5"
            onClick={addTyped}
            disabled={!input.trim()}
          >
            {t.quickCheck.queueAddButton}
          </Button>

          {queue.length === 0 ? (
            <Card className="mb-8 text-center text-bodym text-ink-500">{t.quickCheck.queueEmpty}</Card>
          ) : (
            <>
              <p className="mb-2 text-bodym font-semibold text-ink-900">
                {interpolate(t.quickCheck.queueAddedCount, { count: queue.length })}
              </p>
              <div className="mb-8 flex flex-wrap gap-2">
                {queue.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-pill border border-primary-100 bg-primary-050 py-2 ps-4 pe-2 text-bodym font-semibold text-primary-900"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeItem(name)}
                      aria-label={t.common.cancel}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary-100"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}

          {checkError && <p className="mb-4 text-bodys text-danger-500">{checkError}</p>}

          <Button onClick={runCheck} disabled={queue.length === 0 || checking}>
            {checking && <Loader2 size={16} className="animate-spin" />}
            {checking ? t.quickCheck.queueCheckingButton : t.quickCheck.queueCheckButton}
          </Button>
        </Screen>
      )}

      {step === "result" && (
        <Screen className="flex flex-col">
          <PageHeader title={t.quickCheck.resultTitle} back={false} />

          {unresolved.length > 0 && (
            <div className="mb-4 rounded-md border border-warning-100 bg-warning-050 p-3">
              <p className="mb-1 text-bodys font-semibold text-warning-700">{t.quickCheck.unresolvedTitle}</p>
              {unresolved.map((name) => (
                <p key={name} className="text-caption text-warning-700">
                  {interpolate(t.quickCheck.unresolvedBody, { name })}
                </p>
              ))}
            </div>
          )}

          {pairs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-success-100 text-success-700">
                <CheckCircle2 size={40} />
              </span>
              <h2 className="mb-2 text-h1 font-bold text-success-700">{t.quickCheck.resultSafeTitle}</h2>
              <p className="max-w-xs text-bodym text-ink-700">{t.quickCheck.resultSafeBody}</p>
            </div>
          ) : (
            <div className="mb-6 space-y-3">
              {worstFirst.map((p, i) => (
                <div key={i} className={cn("rounded-lg border p-4", severityCardClass[p.severity])}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert size={20} className={cn("mt-0.5 shrink-0", severityTextClass[p.severity])} />
                      <p className={cn("text-h3 font-bold", severityTextClass[p.severity])}>
                        {severityTitle(p.severity, t)}
                      </p>
                    </div>
                    <Badge variant={severityVariant[p.severity]}>{severityLabel(p.severity, t)}</Badge>
                  </div>
                  <p className={cn("ms-7 mb-1 text-bodym font-semibold", severityTextClass[p.severity])}>
                    {p.names.join(" + ")}
                  </p>
                  <p className={cn("ms-7 text-bodys", severityTextClass[p.severity])}>
                    {getDisplaySummary(p, "patient", t)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mb-6 rounded-md bg-primary-050 p-3 text-caption text-primary-900">
            {t.quickCheck.disclaimer}
          </div>

          <div className="mt-auto space-y-3">
            <Button variant="secondary" onClick={startOver}>
              {t.quickCheck.checkAnotherButton}
            </Button>
            <Button onClick={() => router.push("/home")}>{t.quickCheck.doneButton}</Button>
          </div>
        </Screen>
      )}
    </>
  );
}
