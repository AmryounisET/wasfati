"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const keep = new Set<number>([1, totalPages]);
  for (let p = page - 1; p <= page + 1; p++) {
    if (p >= 1 && p <= totalPages) keep.add(p);
  }
  const sorted = [...keep].sort((a, b) => a - b);

  const items: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push("…");
    items.push(p);
    prev = p;
  }

  return (
    <div className="mt-3 flex items-center justify-center gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
        className="rounded-md p-1.5 text-ink-700 hover:bg-ink-100 disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-caption text-ink-500">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            className={cn(
              "min-w-[2rem] rounded-md px-2 py-1 text-bodys",
              it === page ? "bg-primary-900 font-semibold text-white" : "text-ink-700 hover:bg-ink-100",
            )}
          >
            {it}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
        className="rounded-md p-1.5 text-ink-700 hover:bg-ink-100 disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
