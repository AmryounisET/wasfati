"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Centered desktop modal — distinct from Sheet (bottom-sheet, mobile app
 * chrome). Used only by the admin panel, which is a desktop-oriented
 * internal tool. */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-surface-inverse/50" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface-card p-6 shadow-e3",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-h2 font-bold text-ink-900">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="ms-auto rounded-md p-1 text-ink-500 hover:bg-ink-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
