"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";

export function ResultExplanation({
  resultId,
  initialExplanation,
}: {
  resultId: string;
  initialExplanation: string | null;
}) {
  const supabase = createClient();
  const { t } = useTranslation();
  const [explanation, setExplanation] = useState(initialExplanation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askAi() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-explain", {
        body: { interaction_result_id: resultId },
      });
      if (fnError) throw fnError;
      setExplanation((data as { explanation: string }).explanation);
    } catch {
      setError(t.safetyResult.askAiError);
    } finally {
      setLoading(false);
    }
  }

  if (explanation) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-md border border-primary-100 p-3">
        <Bot size={18} className="mt-0.5 shrink-0 text-primary-700" />
        <p className="text-bodym text-ink-700">{explanation}</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={askAi}
        disabled={loading}
        className="text-bodys font-semibold text-primary-700 disabled:opacity-60"
      >
        {loading ? t.safetyResult.askAiLoading : `🤖 ${t.safetyResult.askAiButton}`}
      </button>
      {error && <p className="mt-1 text-caption text-danger-500">{error}</p>}
    </div>
  );
}
