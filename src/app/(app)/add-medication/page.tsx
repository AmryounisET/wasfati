"use client";

import { useRouter } from "next/navigation";
import { Camera, FileText, Search, PenLine } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function AddMedicationChooserPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const options = [
    { href: "/add-medication/scan", icon: Camera, title: t.addMedicine.scanCardTitle, subtitle: t.addMedicine.scanOptionSubtitle },
    { href: "/add-medication/prescription", icon: FileText, title: t.addMedicine.uploadCardTitle, subtitle: t.addMedicine.prescriptionOptionSubtitle },
    { href: "/add-medication/search", icon: Search, title: t.addMedicine.searchCardTitle, subtitle: t.addMedicine.searchOptionSubtitle },
    { href: "/add-medication/manual", icon: PenLine, title: t.addMedicine.manualCardTitle, subtitle: t.addMedicine.manualOptionSubtitle },
  ];

  return (
    <Sheet open onClose={() => router.back()} title={t.addMedicine.sheetTitle}>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.href}
            type="button"
            onClick={() => router.push(opt.href)}
            className="flex w-full items-center gap-3 rounded-md border border-ink-100 p-4 text-start hover:bg-primary-050"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-100 text-ink-700">
              <opt.icon size={20} />
            </span>
            <span>
              <span className="block text-h3 font-bold text-ink-900">{opt.title}</span>
              <span className="block text-caption text-ink-500">{opt.subtitle}</span>
            </span>
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
