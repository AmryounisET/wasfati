"use client";

import { cn } from "@/lib/utils";

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cn("flex rounded-md bg-primary-050 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-sm px-3 py-2.5 text-button font-semibold transition-all",
              "duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
              active
                ? "bg-surface-card text-primary-900 shadow-e1"
                : "text-ink-500 hover:text-primary-700",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
