"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { dirForLocale } from "@/lib/i18n/locales";

export interface PageHeaderProps {
  title: string;
  back?: boolean;
  onBack?: () => void;
  closeButton?: boolean;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  back = true,
  onBack,
  closeButton = false,
  action,
  className,
}: PageHeaderProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isRtl = dirForLocale(locale) === "rtl";
  const BackIcon = closeButton ? X : isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className={cn("mb-5 flex items-center justify-between gap-3", className)}>
      {back ? (
        <button
          type="button"
          onClick={onBack ?? (() => router.back())}
          aria-label={closeButton ? t.common.close : t.common.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100"
        >
          <BackIcon size={20} />
        </button>
      ) : (
        <span className="w-9" />
      )}
      <h1 className="flex-1 text-center text-h1 font-bold text-ink-900">{title}</h1>
      {action ?? <span className="w-9" />}
    </div>
  );
}
