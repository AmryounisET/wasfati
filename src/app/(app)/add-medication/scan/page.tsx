"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, RotateCcw, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function ScanBoxPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
  }

  function useThisPhoto() {
    // No OCR/box-reading is wired up yet — the honest next step is manual
    // entry rather than pretending to have extracted anything from the
    // photo.
    router.push("/add-medication/manual");
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-inverse px-4 pt-6 pb-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t.common.close}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
        >
          <X size={18} />
        </button>
        <h1 className="text-h2 font-bold">{t.addMedicine.scanOptionTitle}</h1>
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

      <div className="mt-6 space-y-3">
        {capturedImage ? (
          <>
            <Button onClick={useThisPhoto}>{t.addMedicine.scanUsePhotoButton}</Button>
            <Button variant="secondary" onClick={retake}>
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
          onClick={() => router.push("/add-medication/manual")}
          className="w-full text-center text-bodym font-medium text-primary-300"
        >
          {t.addMedicine.scanEnterManually}
        </button>
      </div>
    </div>
  );
}
