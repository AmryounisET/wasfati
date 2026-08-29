"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, RotateCcw, ChevronRight, AlertTriangle } from "lucide-react";
import { recognizeMedicationCandidates, type MedicationCandidate } from "@/lib/ocr";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { interpolate } from "@/lib/i18n/get-dictionary";

const MAX_DIMENSION = 1600;

function drawToJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function imageFileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  return drawToJpeg(bitmap, bitmap.width, bitmap.height);
}

async function pdfFirstPageToDataUrl(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return drawToJpeg(canvas, canvas.width, canvas.height);
}

export default function PrescriptionUploadPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [results, setResults] = useState<MedicationCandidate[] | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileError(null);
    setAnalyzeError(null);
    setResults(null);

    try {
      const dataUrl = file.type === "application/pdf" ? await pdfFirstPageToDataUrl(file) : await imageFileToDataUrl(file);
      setPreview(dataUrl);
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
  }

  function pick(m: MedicationCandidate) {
    const params = new URLSearchParams({
      name: m.name,
      generic: m.name.toLowerCase(),
      dose: m.dose ?? "",
      category: "other",
      source: "prescription_ocr",
    });
    router.push(`/add-medication/manual?${params.toString()}`);
  }

  return (
    <Screen>
      <PageHeader title={t.addMedicine.prescriptionOptionTitle} closeButton />

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
            {interpolate(t.addMedicine.prescriptionResultsTitle, { count: results.length })}
          </p>
          <p className="mb-4 text-bodys text-ink-500">{t.addMedicine.prescriptionResultsSubtitle}</p>
          <div className="space-y-2">
            {results.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(m)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-ink-100 bg-surface-card p-3 text-start hover:bg-primary-050"
              >
                <div>
                  <p className="text-h3 font-bold text-ink-900">{m.name}</p>
                  {m.dose && <p className="text-caption text-ink-500">{m.dose}</p>}
                </div>
                <ChevronRight size={18} className="shrink-0 text-ink-400 rtl:rotate-180" />
              </button>
            ))}
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

      <button
        type="button"
        onClick={() => router.push("/add-medication/manual")}
        className="w-full text-center text-bodym font-medium text-primary-700"
      >
        {t.addMedicine.prescriptionManualButton}
      </button>
    </Screen>
  );
}
