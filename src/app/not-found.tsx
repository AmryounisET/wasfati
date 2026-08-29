import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-app px-6 text-center">
      <SearchX size={40} className="text-ink-500" />
      <h1 className="text-h1 font-bold text-ink-900">الصفحة غير موجودة</h1>
      <p className="text-bodym text-ink-500">لم نتمكن من العثور على الصفحة التي تبحث عنها.</p>
      <Link href="/home" className="text-bodym font-semibold text-primary-700">
        العودة إلى الرئيسية
      </Link>
    </div>
  );
}
