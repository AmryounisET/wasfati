import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-ink-100 bg-surface-card p-4 shadow-e1",
        className,
      )}
      {...props}
    />
  );
}
