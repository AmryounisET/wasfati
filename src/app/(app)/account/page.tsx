import Link from "next/link";
import { UserRound, HeartPulse, Users, Sun, Globe, Lock, FileText, History, Fingerprint, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Screen } from "@/components/layout/Screen";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { dirForLocale } from "@/lib/i18n/locales";
import { displayName } from "@/lib/i18n/transliterate";
import { SignOutButton } from "./SignOutButton";

export default async function AccountPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);
  const isRtl = dirForLocale(locale) === "rtl";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const rows = [
    { href: "/account/health-profile", icon: HeartPulse, title: t.account.healthProfile, subtitle: t.account.healthProfileSubtitle },
    { href: "/medications/history", icon: History, title: t.account.history, subtitle: t.account.historySubtitle },
    { href: "/account/care-circle", icon: Users, title: t.account.careCircle, subtitle: t.account.careCircleSubtitle },
    { href: "/account/security", icon: Fingerprint, title: t.account.security, subtitle: t.account.securitySubtitle },
    { href: "/account/display-mode", icon: Sun, title: t.account.displayMode, subtitle: t.account.displayModeSubtitle },
    { href: "/account/language", icon: Globe, title: t.account.language, subtitle: t.account.languageSubtitle },
    { href: "/account/privacy-policy", icon: Lock, title: t.account.privacy, subtitle: null },
    { href: "/account/terms", icon: FileText, title: t.account.terms, subtitle: null },
  ];

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone_number")
    .eq("id", user.id)
    .single();

  return (
    <Screen>
      <h1 className="mb-5 text-h1 font-bold text-ink-900">{t.account.title}</h1>

      <Link
        href="/account/profile"
        className="mb-4 flex items-center gap-3 rounded-lg bg-primary-100 p-4"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-900 text-white">
          <UserRound size={20} />
        </span>
        <div className="flex-1">
          <p className="text-h3 font-bold text-ink-900">
            {profile?.full_name ? displayName(profile.full_name, locale) : t.account.defaultUser}
          </p>
          <p dir="ltr" className={cn("text-caption text-ink-700", isRtl ? "text-end" : "text-start")}>
            {user.email}
          </p>
          {profile?.phone_number && (
            <p dir="ltr" className={cn("text-caption text-ink-700", isRtl ? "text-end" : "text-start")}>
              {profile.phone_number}
            </p>
          )}
        </div>
        <ChevronIcon size={18} className="shrink-0 text-primary-900" />
      </Link>

      <div className="space-y-2">
        {rows.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="flex items-center gap-3 rounded-md border border-ink-100 bg-surface-card p-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-050 text-primary-700">
              <row.icon size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-h3 font-bold text-ink-900">{row.title}</span>
              {row.subtitle && <span className="block text-caption text-ink-500">{row.subtitle}</span>}
            </span>
            <ChevronIcon size={18} className="text-ink-500" />
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </Screen>
  );
}
