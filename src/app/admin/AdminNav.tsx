"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Pill, ShieldAlert, FileText, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/supabase/types";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/care-circle", label: "Care Circle", icon: HeartHandshake },
  { href: "/admin/drugs", label: "Drugs", icon: Pill },
  { href: "/admin/interactions", label: "Interactions", icon: ShieldAlert },
  { href: "/admin/legal", label: "Legal Documents", icon: FileText },
];

export function AdminNav({ role, backToAppLabel }: { role: AdminRole; backToAppLabel: string }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-ink-100 bg-surface-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-bodys font-medium transition-colors",
                  active ? "bg-primary-100 text-primary-900" : "text-ink-500 hover:bg-ink-100",
                )}
              >
                <Icon size={16} />
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-3 ps-3">
          <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-caption font-medium text-ink-700">{role}</span>
          <Link href="/home" className="text-bodys font-medium text-primary-700">
            {backToAppLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
