"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, RotateCcw, Camera, Loader2 } from "lucide-react";
import { recognizeMedicationCandidates } from "@/lib/ocr";
import { addToQuickCheckQueue } from "@/lib/quick-check-queue";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function QuickCheckScanPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t.addMedicine.scanUnavailable);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError(t.addMedicine.scanPermissionDenied);
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError(t.addMedicine.scanNoCamera);
        } else {
          setError(t.addMedicine.scanUnavailable);
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
  }

  function retake() {
    setCapturedImage(null);
    setAnalyzeError(null);
  }

  async function useThisPhoto() {
    if (!capturedImage) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const medications = await recognizeMedicationCandidates(capturedImage);
      if (medications.length === 0) {
        setAnalyzeError(t.quickCheck.scanNoNameFound);
        return;
      }
      addToQuickCheckQueue(medications[0].name);
      router.push("/quick-check");
    } catch {
      setAnalyzeError(t.quickCheck.scanNoNameFound);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-inverse px-4 pt-6 pb-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/quick-check")}
          aria-label={t.common.close}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
        >
          <X size={18} />
        </button>
        <h1 className="text-h2 font-bold">{t.quickCheck.chooserScanTitle}</h1>
        <span className="h-9 w-9" />
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-black">
        {capturedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="" className="h-full w-full object-contain" />
        ) : (
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        )}

        {!ready && !error && !capturedImage && (
          <p className="absolute text-bodym text-white/70">{t.common.loading}</p>
        )}

        {ready && !capturedImage && (
          <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-dashed border-white/50" />
        )}

        {ready && !capturedImage && (
          <p className="absolute bottom-4 left-0 right-0 px-6 text-center text-bodys text-white/80">
            {t.addMedicine.scanInstruction}
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-center text-bodys text-danger-500">{error}</p>}
      {analyzeError && <p className="mt-4 text-center text-bodys text-danger-500">{analyzeError}</p>}

      <div className="mt-6 space-y-3">
        {capturedImage ? (
          <>
            <Button onClick={useThisPhoto} disabled={analyzing}>
              {analyzing && <Loader2 size={16} className="animate-spin" />}
              {analyzing ? t.addMedicine.prescriptionAnalyzing : t.addMedicine.scanUsePhotoButton}
            </Button>
            <Button variant="secondary" onClick={retake} disabled={analyzing}>
              <RotateCcw size={18} />
              {t.addMedicine.scanRetakeButton}
            </Button>
          </>
        ) : (
          <Button onClick={capture} disabled={!ready}>
            <Camera size={18} />
            {t.addMedicine.scanStartButton}
          </Button>
        )}
        <button
          type="button"
          onClick={() => router.push("/quick-check")}
          className="w-full text-center text-bodym font-medium text-primary-300"
        >
          {t.quickCheck.chooserCancel}
        </button>
      </div>
    </div>
  );
}
