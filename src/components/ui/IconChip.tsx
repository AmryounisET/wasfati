import {
  Heart,
  Pill,
  Syringe,
  Stethoscope,
  Wind,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MedicationCategory =
  | "heart"
  | "diabetes"
  | "pain"
  | "antibiotic"
  | "stomach"
  | "cholesterol"
  | "other";

const categoryMap: Record<MedicationCategory, { icon: LucideIcon; bg: string }> = {
  heart: { icon: Heart, bg: "bg-category-rose" },
  diabetes: { icon: Stethoscope, bg: "bg-category-violet" },
  pain: { icon: Pill, bg: "bg-category-orange" },
  antibiotic: { icon: Syringe, bg: "bg-category-sky" },
  stomach: { icon: Wind, bg: "bg-category-sky" },
  cholesterol: { icon: Heart, bg: "bg-category-pinkred" },
  other: { icon: Sparkles, bg: "bg-ink-300" },
};

export interface IconChipProps {
  category?: MedicationCategory | string;
  size?: "sm" | "md";
  className?: string;
}

export function IconChip({ category = "other", size = "md", className }: IconChipProps) {
  const entry = categoryMap[category as MedicationCategory] ?? categoryMap.other;
  const Icon = entry.icon;
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? 16 : 20;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-white",
        dim,
        entry.bg,
        className,
      )}
    >
      <Icon size={iconSize} />
    </span>
  );
}
