"use client";

import { useRouter } from "next/navigation";
import { FileText, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function PrescriptionUploadPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Screen>
      <PageHeader title={t.addMedicine.prescriptionOptionTitle} closeButton />

      <div className="mb-4 flex items-center gap-3 rounded-md border border-ink-100 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-050 text-primary-700">
          <RotateCcw size={16} />
        </span>
        <span className="flex-1">
          <span className="block text-h3 font-bold text-ink-900">{t.addMedicine.prescriptionNoFileTitle}</span>
          <span className="block text-caption text-ink-500">{t.addMedicine.prescriptionNoFileBody}</span>
        </span>
        <FileText size={18} className="shrink-0 text-ink-500" />
      </div>

      <Banner variant="warning" className="mb-6">
        <p className="text-bodys">{t.addMedicine.prescriptionDisclaimer}</p>
      </Banner>

      <Button variant="secondary" onClick={() => router.push("/add-medication/manual")}>
        {t.addMedicine.prescriptionManualButton}
      </Button>
    </Screen>
  );
}
