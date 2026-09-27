"use client";

import { useRouter } from "next/navigation";
import { Camera, FileText, Search, PenLine, ChevronRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function AddMedicationChooserPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const secondaryOptions = [
    { href: "/add-medication/scan", icon: Camera, title: t.addMedicine.scanCardTitle, subtitle: t.addMedicine.scanOptionSubtitle },
    { href: "/add-medication/prescription", icon: FileText, title: t.addMedicine.uploadCardTitle, subtitle: t.addMedicine.prescriptionOptionSubtitle },
    { href: "/add-medication/manual", icon: PenLine, title: t.addMedicine.manualCardTitle, subtitle: t.addMedicine.manualOptionSubtitle },
  ];

  return (
    <Sheet open onClose={() => router.back()} title={t.addMedicine.sheetTitle}>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.push("/add-medication/search")}
          className="flex w-full items-center gap-3 rounded-lg border-2 border-primary-500 bg-primary-050 p-4 text-start"
        >
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-md bg-primary-500 text-white">
            <Search size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-h3 font-bold text-ink-900">{t.addMedicine.searchCardTitle}</span>
            <span className="block text-caption text-primary-900">{t.addMedicine.searchOptionSubtitle}</span>
          </span>
          <span className="shrink-0 rounded-pill bg-primary-500 px-2.5 py-1 text-[11.5px] font-bold tracking-wide text-white uppercase">
            {t.addMedicine.recommendedBadge}
          </span>
        </button>

        {secondaryOptions.map((opt) => (
          <button
            key={opt.href}
            type="button"
            onClick={() => router.push(opt.href)}
            className="flex w-full items-center gap-3 rounded-lg border border-ink-100 p-3.5 text-start hover:border-primary-300"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-500">
              <opt.icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-bodym font-bold text-ink-900">{opt.title}</span>
              <span className="block text-caption text-ink-500">{opt.subtitle}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-300" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => router.back()}
        className="mt-4 w-full text-center text-bodym text-ink-500"
      >
        {t.addMedicine.cancel}
      </button>
    </Sheet>
  );
}
