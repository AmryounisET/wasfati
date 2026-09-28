import { requireAdmin, canWriteLandingPage } from "@/lib/supabase/admin";
import { DEFAULT_LANDING_CONTENT } from "@/lib/landing-content";
import { LandingPageManager } from "./LandingPageManager";
import type { LandingLocale, LandingPageContentRow } from "@/lib/supabase/types";

const LANDING_LOCALES: LandingLocale[] = ["en", "ar"];

export default async function AdminLandingPagePage() {
  const { supabase, role } = await requireAdmin();

  const { data: rows } = await supabase.from("landing_page_content").select("*");

  const byLocale: Record<LandingLocale, LandingPageContentRow | null> = {
    en: null,
    ar: null,
  };
  for (const row of rows ?? []) {
    if (row.locale === "en" || row.locale === "ar") byLocale[row.locale] = row;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-ink-900">Landing Page</h1>
        <p className="text-bodys text-ink-500">
          Copy shown on the public marketing page at wasfati.app/ — in English and Arabic. Superadmin-only to
          edit. The page falls back to the built-in default copy until a row exists for a language.
        </p>
      </div>

      <LandingPageManager
        locales={LANDING_LOCALES}
        initial={{
          en: byLocale.en?.content ?? DEFAULT_LANDING_CONTENT.en,
          ar: byLocale.ar?.content ?? DEFAULT_LANDING_CONTENT.ar,
        }}
        updatedAt={{ en: byLocale.en?.updated_at ?? null, ar: byLocale.ar?.updated_at ?? null }}
        canWrite={canWriteLandingPage(role)}
      />
    </div>
  );
}
