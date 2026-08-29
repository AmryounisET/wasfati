"use client";

import { Printer } from "lucide-react";
import { useTranslation } from "@/components/providers/LanguageProvider";

export function PrintButton() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-md bg-primary-900 px-4 py-2.5 text-button font-bold text-white"
    >
      <Printer size={16} />
      {t.report.printButton}
    </button>
  );
}
