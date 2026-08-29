import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Screen({
  children,
  className,
  withNavPadding = true,
}: {
  children: ReactNode;
  className?: string;
  withNavPadding?: boolean;
}) {
  return (
    <div className="min-h-full bg-surface-app">
      <div
        className={cn(
          "mx-auto flex min-h-full w-full max-w-md flex-col px-4 pt-6",
          withNavPadding && "pb-28",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
