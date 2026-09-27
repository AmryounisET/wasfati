import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  primary:
    "bg-gradient-to-r from-primary-500 to-primary-900 text-white font-bold shadow-[0_10px_22px_-10px_rgba(11,61,48,0.55)] " +
    "active:brightness-95 disabled:from-ink-100 disabled:to-ink-100 disabled:shadow-none disabled:text-ink-500",
  secondary:
    "bg-primary-100 text-primary-900 hover:bg-primary-300/60 disabled:bg-ink-100 disabled:text-ink-500",
  outline:
    "bg-transparent text-primary-900 border border-ink-300 hover:bg-primary-050 disabled:text-ink-500 disabled:border-ink-100",
  ghost: "bg-transparent text-primary-700 hover:bg-primary-050 disabled:text-ink-500",
  danger:
    "bg-gradient-to-r from-danger-500 to-danger-700 text-white active:brightness-95 " +
    "disabled:from-ink-100 disabled:to-ink-100 disabled:text-ink-500",
} as const;

const sizeClasses = {
  md: "h-12 px-5 text-button rounded-md",
  lg: "h-14 px-6 text-button rounded-lg",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "lg", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 font-semibold transition-colors",
          "duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
          "disabled:cursor-not-allowed",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
