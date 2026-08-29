"use client";

import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-surface-inverse/50 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-md rounded-t-xl bg-surface-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]",
          "shadow-e3 sheet-enter",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-pill bg-ink-300" />
        {title && <h2 className="mb-4 text-center text-h2 font-bold text-ink-900">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
