import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  neutral: "bg-ink-100 text-ink-700",
  primary: "bg-primary-100 text-primary-900",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  solid: "bg-primary-900 text-white",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-caption font-medium whitespace-nowrap",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
