import Image from "next/image";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function Loading() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-primary-900 text-white">
      <Image
        src="/icons/logo-mark-white.png"
        alt={t.common.appName}
        width={280}
        height={280}
        priority
      />
      <p className="text-bodys text-white/70">{t.common.tagline}</p>
      <div className="mt-2 flex items-center gap-2 text-bodys text-white/60">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        {t.common.loading}
      </div>
    </div>
  );
}
