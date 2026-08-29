import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);

  if (!role) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert size={40} className="text-danger-500" />
        <h1 className="text-h2 font-bold text-ink-900">{t.admin.accessDeniedTitle}</h1>
        <p className="text-bodym text-ink-500">{t.admin.accessDeniedBody}</p>
        <Link href="/home" className="text-bodym font-semibold text-primary-700">
          {t.admin.backToApp}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-app">
      <AdminNav role={role} backToAppLabel={t.admin.backToApp} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
