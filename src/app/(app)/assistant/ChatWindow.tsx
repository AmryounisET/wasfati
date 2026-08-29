"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/supabase/types";

export function ChatWindow({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const supabase = createClient();
  const { t } = useTranslation();

  const welcome: ChatMessage = {
    id: "welcome",
    user_id: "",
    source: "ai",
    text: t.assistant.welcomeMessage,
    created_at: new Date().toISOString(),
  };
  const suggestions = [t.assistant.suggestion1, t.assistant.suggestion2, t.assistant.suggestion3];

  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length ? initialMessages : [welcome],
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setSending(true);
    setInput("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      source: "user",
      text: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    await supabase.from("chat_messages").insert({ user_id: user.id, source: "user", text: question });

    try {
      const { data, error } = await supabase.functions.invoke("ai-explain", {
        body: { chat_message: question },
      });
      if (error) throw error;
      const reply = (data as { reply: string }).reply;
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), user_id: user.id, source: "ai", text: reply, created_at: new Date().toISOString() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          user_id: user.id,
          source: "ai",
          text: t.assistant.errorMessage,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.source === "user" ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-3 text-bodym",
                m.source === "user"
                  ? "bg-primary-900 text-white"
                  : "border border-ink-100 bg-surface-card text-ink-900",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="shrink-0 rounded-pill border border-ink-300 bg-surface-card px-3 py-1.5 text-bodys text-ink-700"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-16 z-30 mx-auto flex w-full max-w-md items-center gap-2 border-t border-ink-100 bg-surface-card px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.assistant.inputPlaceholder}
          className="h-11 flex-1 rounded-pill border border-ink-300 bg-surface-app px-4 text-bodyl focus:border-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-900 text-white disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
