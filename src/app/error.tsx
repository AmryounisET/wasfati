"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-app px-6 text-center">
      <AlertTriangle size={40} className="text-danger-500" />
      <h1 className="text-h1 font-bold text-ink-900">حدث خطأ غير متوقع</h1>
      <p className="text-bodym text-ink-500">
        نعتذر عن هذا الخلل. يرجى المحاولة مرة أخرى، وإذا استمرت المشكلة تواصل مع الدعم.
      </p>
      <div className="w-full max-w-xs">
        <Button onClick={() => reset()}>إعادة المحاولة</Button>
      </div>
    </div>
  );
}
