"use client";

import { useState } from "react";

/** Wasfati has no App Store/Play Store listing — it's installed as a PWA —
 * so the final CTA reveals "Add to Home Screen" steps instead of linking
 * to a store. Swap this for a real store link once one exists. */
export function LandingInstallCta({
  ctaLabel,
  installTitle,
  installSteps,
}: {
  ctaLabel: string;
  installTitle: string;
  installSteps: readonly [string, string, string];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative mt-6 rounded-pill bg-gradient-to-br from-coral-600 to-coral-deep px-7 py-4 text-bodyl font-bold text-white shadow-[0_14px_30px_-10px_rgba(181,53,15,0.5)]"
      >
        {ctaLabel}
      </button>

      {open && (
        <div className="relative mx-auto mt-6 max-w-md rounded-xl bg-surface-card p-6 text-start shadow-[0_10px_28px_-14px_rgba(11,61,48,0.25)]">
          <h3 className="text-bodym font-bold text-ink-900">{installTitle}</h3>
          <ol className="mt-3 list-decimal space-y-2 ps-5 text-bodys leading-relaxed text-ink-700">
            {installSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
