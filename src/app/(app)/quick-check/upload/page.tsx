"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, RotateCcw, Check, Plus, AlertTriangle } from "lucide-react";
import { recognizeMedicationCandidates, type MedicationCandidate } from "@/lib/ocr";
import { fileToDataUrl } from "@/lib/image-input";
import { addToQuickCheckQueue } from "@/lib/quick-check-queue";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { interpolate } from "@/lib/i18n/get-dictionary";

export default function QuickCheckUploadPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [results, setResults] = useState<MedicationCandidate[] | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileError(null);
    setAnalyzeError(null);
    setResults(null);
    setAdded(new Set());

    try {
      setPreview(await fileToDataUrl(file));
    } catch {
      setFileError(t.addMedicine.prescriptionUnsupportedFile);
    }
  }

  async function analyze() {
    if (!preview) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      setResults(await recognizeMedicationCandidates(preview));
    } catch {
      setAnalyzeError(t.addMedicine.prescriptionErrorBody);
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setPreview(null);
    setFileError(null);
    setAnalyzeError(null);
    setResults(null);
    setAdded(new Set());
  }

  function addCandidate(m: MedicationCandidate) {
    addToQuickCheckQueue(m.name);
    setAdded((prev) => new Set(prev).add(m.name));
  }

  return (
    <Screen>
      <PageHeader title={t.quickCheck.chooserUploadTitle} onBack={() => router.push("/quick-check")} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onFileChange}
      />

      {!preview && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mb-4 flex w-full items-center gap-3 rounded-md border border-dashed border-primary-300 p-4 text-start hover:bg-primary-050"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-050 text-primary-700">
              <FileText size={20} />
            </span>
            <span>
              <span className="block text-h3 font-bold text-ink-900">{t.addMedicine.prescriptionChooseFile}</span>
              <span className="block text-caption text-ink-500">{t.addMedicine.prescriptionOptionSubtitle}</span>
            </span>
          </button>

          {fileError && <p className="mb-4 text-bodys text-danger-500">{fileError}</p>}

          <Banner variant="warning" className="mb-6">
            <p className="text-bodys">{t.addMedicine.prescriptionDisclaimer}</p>
          </Banner>
        </>
      )}

      {preview && !results && (
        <div className="mb-6">
          <div className="mb-4 overflow-hidden rounded-lg border border-ink-100 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="max-h-96 w-full object-contain" />
          </div>

          {analyzeError && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-danger-050 p-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-danger-500" size={18} />
              <p className="text-bodys text-danger-500">{analyzeError}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={analyze} disabled={analyzing}>
              {analyzing && <Loader2 size={16} className="animate-spin" />}
              {analyzing ? t.addMedicine.prescriptionAnalyzing : t.addMedicine.prescriptionAnalyzeButton}
            </Button>
            <Button variant="secondary" onClick={reset} disabled={analyzing}>
              <RotateCcw size={16} />
              {t.addMedicine.prescriptionChooseDifferentFile}
            </Button>
          </div>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mb-6">
          <p className="mb-1 text-h3 font-bold text-ink-900">
            {interpolate(t.quickCheck.uploadResultsTitle, { count: results.length })}
          </p>
          <p className="mb-4 text-bodys text-ink-500">{t.quickCheck.uploadResultsSubtitle}</p>
          <div className="space-y-2">
            {results.map((m, i) => {
              const isAdded = added.has(m.name);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => addCandidate(m)}
                  disabled={isAdded}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-ink-100 bg-surface-card p-3 text-start hover:bg-primary-050 disabled:opacity-70"
                >
                  <div>
                    <p className="text-h3 font-bold text-ink-900">{m.name}</p>
                    {m.dose && <p className="text-caption text-ink-500">{m.dose}</p>}
                  </div>
                  {isAdded ? (
                    <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-success-700">
                      <Check size={16} />
                      {t.quickCheck.uploadAddedLabel}
                    </span>
                  ) : (
                    <Plus size={18} className="shrink-0 text-primary-700" />
                  )}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={reset} className="mt-4 w-full text-center text-bodym text-primary-700">
            {t.addMedicine.prescriptionChooseDifferentFile}
          </button>
        </div>
      )}

      {results && results.length === 0 && (
        <Card className="mb-6 text-center">
          <p className="mb-1 text-h3 font-bold text-ink-900">{t.addMedicine.prescriptionEmptyTitle}</p>
          <p className="mb-4 text-bodys text-ink-500">{t.addMedicine.prescriptionEmptyBody}</p>
          <Button variant="secondary" onClick={reset}>
            <RotateCcw size={16} />
            {t.addMedicine.prescriptionChooseDifferentFile}
          </Button>
        </Card>
      )}

      <Button onClick={() => router.push("/quick-check")} disabled={added.size === 0}>
        {interpolate(t.quickCheck.uploadDoneButton, { count: added.size })}
      </Button>
    </Screen>
  );
}
