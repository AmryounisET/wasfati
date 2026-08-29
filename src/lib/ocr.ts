export type MedicationCandidate = { name: string; dose: string | null };

// Matches a dose token like "500mg", "10 ml", "2.5mcg" — kept unit-attached
// (no space) so the manual-entry form's own prefill regex
// (/([\d.]+)\s*([a-zA-Z]+)/) parses it the same way it already does for the
// drug-search flow.
const DOSE_PATTERN = /(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|iu)\b/i;

/** Runs on-device OCR (Tesseract.js, English) over a prescription/box-label
 * image and returns a best-effort list of {name, dose} candidates — one per
 * line that contains a recognizable dose. Recognition happens entirely in
 * the browser; the image is never sent anywhere. Deliberately conservative:
 * a line with no legible dose is dropped rather than guessed at, since a
 * wrong medicine name is worse than none in a medication-safety app.
 *
 * English-only for this MVP — trade names on packaging are printed in Latin
 * script even in Arabic-market products, which covers the highest-value
 * case; a handwritten prescription in Arabic or another non-Latin script
 * will likely come back empty, same as any other unreadable image (the
 * caller already has a "couldn't read this, enter manually" fallback for
 * that). */
export async function recognizeMedicationCandidates(imageDataUrl: string): Promise<MedicationCandidate[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(imageDataUrl);
    const lines = data.text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const candidates: MedicationCandidate[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const match = line.match(DOSE_PATTERN);
      if (!match || match.index === undefined) continue;
      const dose = `${match[1]}${match[2].toLowerCase()}`;
      const name = line.slice(0, match.index).replace(/[,:;\-–|]+$/, "").trim();
      if (name.length < 2) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ name, dose });
    }
    return candidates;
  } finally {
    await worker.terminate();
  }
}
