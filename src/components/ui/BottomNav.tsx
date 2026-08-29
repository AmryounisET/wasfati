"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Link2, MessageCircle, Plus, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/LanguageProvider";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

function getItems(t: Dictionary): { href: string; label: string; icon: LucideIcon; isFab?: boolean }[] {
  return [
    { href: "/home", label: t.nav.home, icon: Home },
    { href: "/medications", label: t.nav.medications, icon: Link2 },
    { href: "/add-medication", label: "", icon: Plus, isFab: true },
    { href: "/assistant", label: t.nav.assistant, icon: MessageCircle },
    { href: "/account", label: t.nav.account, icon: User },
  ];
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const items = getItems(t);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary-900/40 bg-surface-inverse pb-[env(safe-area-inset-bottom)] print:hidden"
      aria-label={t.nav.home}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-3 py-2">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <button
                key={item.href}
                type="button"
                aria-label={t.nav.addMedicine}
                onClick={() => router.push(item.href)}
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-fab transition-transform duration-[var(--duration-fast)] active:scale-95"
              >
                <Icon size={26} />
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-16 flex-col items-center gap-1 rounded-md py-1 text-caption"
            >
              <span
                className={cn(
                  "flex h-9 w-14 items-center justify-center rounded-pill transition-colors duration-[var(--duration-fast)]",
                  active ? "bg-primary-100 text-primary-900" : "text-white/70",
                )}
              >
                <Icon size={20} />
              </span>
              <span className={cn(active ? "text-white font-medium" : "text-white/60")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
