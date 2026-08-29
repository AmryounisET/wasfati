import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";
import { LOCALE_COOKIE } from "./cookie";

/** Server-only: reads the active locale from the request's cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}
