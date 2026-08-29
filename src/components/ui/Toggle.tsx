"use client";

import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelEn?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, labelEn, disabled, className }: ToggleProps) {
  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-pill transition-colors duration-[var(--duration-fast)]",
        checked ? "bg-primary-900" : "bg-ink-300",
        disabled && "opacity-50",
        !label && !labelEn && className,
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-e1 transition-all duration-[var(--duration-fast)]",
          checked ? "end-1" : "start-1",
        )}
      />
    </button>
  );

  if (!label && !labelEn) return switchEl;

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div>
        {label && <p className="text-bodym font-medium text-ink-900">{label}</p>}
        {labelEn && <p className="text-caption text-ink-500">{labelEn}</p>}
      </div>
      {switchEl}
    </div>
  );
}
