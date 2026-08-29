export const LOCALES = ["ar", "en", "fr", "it", "es", "tr", "ru", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function dirForLocale(locale: Locale): "rtl" | "ltr" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

export const LOCALE_NAMES: Record<Locale, { native: string; english: string }> = {
  ar: { native: "العربية", english: "Arabic" },
  en: { native: "English", english: "English" },
  fr: { native: "Français", english: "French" },
  it: { native: "Italiano", english: "Italian" },
  es: { native: "Español", english: "Spanish" },
  tr: { native: "Türkçe", english: "Turkish" },
  ru: { native: "Русский", english: "Russian" },
  zh: { native: "中文", english: "Chinese" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Maps our locale codes to Intl-compatible tags for date/number formatting. */
export const INTL_TAG: Record<Locale, string> = {
  ar: "ar-SA",
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  tr: "tr-TR",
  ru: "ru-RU",
  zh: "zh-CN",
};
