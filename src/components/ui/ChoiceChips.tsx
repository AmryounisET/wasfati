"use client";

import { cn } from "@/lib/utils";

export interface ChoiceChipsOption {
  value: string;
  label: string;
}

export interface ChoiceChipsProps {
  options: ChoiceChipsOption[];
  value: string | string[];
  onChange: (value: string) => void;
  className?: string;
}

export function ChoiceChips({ options, value, onChange, className }: ChoiceChipsProps) {
  const isActive = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className={cn("flex gap-2 overflow-x-auto no-scrollbar", className)}>
      {options.map((option) => {
        const active = isActive(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 rounded-pill border px-4 py-2 text-bodys font-medium whitespace-nowrap transition-colors",
              "duration-[var(--duration-fast)]",
              active
                ? "border-primary-900 bg-primary-900 font-bold text-white"
                : "border-ink-300 bg-surface-card text-ink-700 hover:border-primary-300",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
