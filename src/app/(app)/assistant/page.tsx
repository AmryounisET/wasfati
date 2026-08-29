import { createClient } from "@/lib/supabase/server";
import { Banner } from "@/components/ui/Banner";
import { ChatWindow } from "./ChatWindow";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      <Banner variant="warning" className="rounded-none border-0 border-b border-warning-100">
        <p className="text-caption">{t.assistant.disclaimerBanner}</p>
      </Banner>
      <ChatWindow initialMessages={messages ?? []} />
    </div>
  );
}
