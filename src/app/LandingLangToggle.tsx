"use client";

import { useTranslation } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

/** EN/AR switch for the public landing page. Reuses the app's own
 * setLocale (cookie + <html dir/lang> + router.refresh()) so the root page
 * re-fetches the right locale's landing_page_content row, and so the
 * choice carries into /login if the visitor signs up right after. */
export function LandingLangToggle() {
  const { locale, setLocale } = useTranslation();
  const active = locale === "ar" ? "ar" : "en";

  return (
    <div className="border-b border-ink-100 bg-primary-050">
      <div className="mx-auto flex max-w-5xl justify-center gap-1.5 px-6 py-1.5">
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={cn(
            "rounded-pill px-3 py-1 text-caption font-bold",
            active === "en" ? "bg-primary-500 text-white" : "text-ink-500",
          )}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLocale("ar")}
          className={cn(
            "rounded-pill px-3 py-1 text-caption font-bold",
            active === "ar" ? "bg-primary-500 text-white" : "text-ink-500",
          )}
        >
          العربية
        </button>
      </div>
    </div>
  );
}
