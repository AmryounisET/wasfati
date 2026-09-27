import { MessageCircle, ShieldCheck } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Banner } from "@/components/ui/Banner";
import { ChatWindow } from "./ChatWindow";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AssistantPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return (
    <div className="flex min-h-full flex-col bg-surface-app pb-28">
      <div className="flex items-center gap-3 border-b border-ink-100 bg-surface-card px-5 py-4">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary-500 to-primary-900 text-white">
          <MessageCircle size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-bodyl font-bold text-ink-900">{t.assistant.headerTitle}</p>
          <p className="flex items-center gap-1.5 text-caption text-success-700">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success-700" />
            {t.assistant.headerStatus}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-pill bg-primary-050 px-2.5 py-1 text-[11.5px] font-bold tracking-wide text-primary-900 uppercase">
          <ShieldCheck size={12} />
          {t.assistant.headerBadge}
        </span>
      </div>
      <Banner variant="warning" className="rounded-none border-0 border-b border-warning-100">
        <p className="text-caption">{t.assistant.disclaimerBanner}</p>
      </Banner>
      <ChatWindow initialMessages={messages ?? []} />
    </div>
  );
}
