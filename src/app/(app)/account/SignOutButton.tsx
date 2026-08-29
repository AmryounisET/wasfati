"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-danger-100 py-3 text-bodym font-semibold text-danger-500"
    >
      <LogOut size={16} />
      {t.account.signOut}
    </button>
  );
}
