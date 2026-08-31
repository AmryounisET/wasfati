// Client-side helpers for turning a picked file (photo or PDF) into a
// downscaled JPEG data URL ready for on-device OCR — shared by the
// prescription-upload and quick-check-upload flows.

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

/** Converts a picked image or PDF (first page only) into a downscaled JPEG
 * data URL. Throws if the file type isn't supported. */
export async function fileToDataUrl(file: File): Promise<string> {
  return file.type === "application/pdf" ? pdfFirstPageToDataUrl(file) : imageFileToDataUrl(file);
}
