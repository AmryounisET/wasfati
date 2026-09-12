export type MedicationCandidate = { name: string; dose: string | null };

// Matches a dose token like "500mg", "10 ml", "2.5mcg" — kept unit-attached
// (no space) so the manual-entry form's own prefill regex
// (/([\d.]+)\s*([a-zA-Z]+)/) parses it the same way it already does for the
// drug-search flow.
const DOSE_PATTERN = /(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|iu)\b/i;

// Fallback for trade names that bake the strength straight into the name
// with no unit printed next to it at all — "Brufen 400", "Advil 200" — a
// real, common packaging style, not an edge case. Only matches a number at
// the very end of the line so it doesn't fire on batch codes, phone
// numbers, or other digits appearing mid-line.
const BARE_NUMBER_PATTERN = /^(.+?)\s+(\d{2,4})$/;

// Dosage-form / packaging descriptor words that sit right next to the
// strength on real boxes ("Ventolin / Nebules / 2.5mg/2.5ml") but aren't the
// trade name themselves — skipped when hunting for the nearest name line so
// a line like "Nebules" doesn't get mistaken for the medicine name.
const DOSAGE_FORM_WORDS = new Set([
  "tablet", "tablets", "capsule", "capsules", "nebule", "nebules", "syrup",
  "suspension", "injection", "solution", "drops", "cream", "ointment", "gel",
  "patch", "patches", "sachet", "sachets", "lotion", "spray", "inhaler",
  "ampoule", "ampoules", "vial", "vials", "suppository", "suppositories",
]);

function cleanName(raw: string): string {
  return raw.replace(/[,:;\-–|]+$/, "").trim();
}

function isDosageFormWord(raw: string): boolean {
  return DOSAGE_FORM_WORDS.has(cleanName(raw).toLowerCase());
}

/** Runs on-device OCR (Tesseract.js, English) over a prescription/box-label
 * image and returns a best-effort list of {name, dose} candidates.
 * Recognition happens entirely in the browser; the image is never sent
 * anywhere.
 *
 * Real packaging almost never prints the trade name and strength on the
 * same physical line the way "Paracetamol 500mg" does in a neat list —
 * more commonly the name is on its own line with the strength on the line
 * below (or above), or the strength is baked into the name with no unit at
 * all ("Brufen 400"). So besides the same-line case, a dose-only line gets
 * paired with the nearest preceding line that isn't itself another dose
 * line or a bare dosage-form word ("Nebules", "Tablets" — real but not the
 * trade name), and a trailing bare number gets treated as an
 * unrecognized-unit dose. Still deliberately conservative beyond that: a line with nothing
 * dose-like anywhere near it is dropped rather than guessed at, since a
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

    function addCandidate(rawName: string, dose: string | null) {
      const name = cleanName(rawName);
      if (name.length < 2) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ name, dose });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(DOSE_PATTERN);

      if (match && match.index !== undefined) {
        const dose = `${match[1]}${match[2].toLowerCase()}`;
        const sameLineName = line.slice(0, match.index);
        const cleanedSameLine = cleanName(sameLineName);
        if (cleanedSameLine.length >= 2 && !isDosageFormWord(cleanedSameLine)) {
          addCandidate(sameLineName, dose);
          continue;
        }
        // Dose sits alone on its own line (or shares it with just a
        // dosage-form word like "Nebules") — look upward for the nearest
        // line that isn't itself another dose line or a dosage-form
        // descriptor.
        for (let j = i - 1; j >= 0 && j >= i - 2; j--) {
          if (DOSE_PATTERN.test(lines[j]) || isDosageFormWord(lines[j])) continue;
          addCandidate(lines[j], dose);
          break;
        }
        continue;
      }

      const bareMatch = line.match(BARE_NUMBER_PATTERN);
      if (bareMatch) {
        addCandidate(bareMatch[1], bareMatch[2]);
      }
    }

    return candidates;
  } finally {
    await worker.terminate();
  }
}
