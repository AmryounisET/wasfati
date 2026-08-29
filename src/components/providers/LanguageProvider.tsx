"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { dirForLocale, type Locale } from "@/lib/i18n/locales";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n/cookie";

interface LanguageContextValue {
  locale: Locale;
  t: Dictionary;
  /** Updates the cookie + <html> attrs immediately, then re-renders server content. */
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = dirForLocale(next);
      setLocaleState(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, t: getDictionary(locale), setLocale }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}
