import type { Locale } from "./locales";
import type { Dictionary } from "./dictionaries/ar";
import ar from "./dictionaries/ar";
import en from "./dictionaries/en";
import fr from "./dictionaries/fr";
import it from "./dictionaries/it";
import es from "./dictionaries/es";
import tr from "./dictionaries/tr";
import ru from "./dictionaries/ru";
import zh from "./dictionaries/zh";

const dictionaries: Record<Locale, Dictionary> = { ar, en, fr, it, es, tr, ru, zh };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.ar;
}

export type { Dictionary };

/** Fills `{placeholder}` tokens, e.g. interpolate(t.home.missedDoseBody, { name, dose }). */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
