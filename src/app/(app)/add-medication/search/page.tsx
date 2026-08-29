"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Screen } from "@/components/layout/Screen";
import { IconChip } from "@/components/ui/IconChip";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { interpolate } from "@/lib/i18n/get-dictionary";
import type { Drug } from "@/lib/supabase/types";

export default function SearchMedicinePage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);

  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("drugs")
        .select("*")
        .ilike("trade_name", `%${term}%`)
        .order("trade_name", { ascending: true })
        .limit(30);
      setResults(data ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [term, supabase]);

  const visibleResults = term.length < 2 ? [] : results;

  function handleQueryChange(value: string) {
    setQuery(value);
    setLoading(value.trim().length >= 2);
  }

  function pick(d: Drug) {
    const params = new URLSearchParams({
      name: d.trade_name,
      generic: d.generic_name,
      dose: d.common_dose ?? "",
      category: d.category ?? "other",
      source: "search",
    });
    router.push(`/add-medication/manual?${params.toString()}`);
  }

  return (
    <Screen>
      <PageHeader title={t.addMedicine.searchOptionTitle} closeButton />

      <div className="relative mb-4">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-500" size={18} />
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t.addMedicine.searchPlaceholder}
          className="h-12 w-full rounded-md border border-ink-300 bg-surface-card ps-4 pe-10 text-bodyl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      {term.length >= 2 && (
        <p className="mb-2 text-caption text-ink-500">
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> {t.addMedicine.searching}
            </span>
          ) : (
            interpolate(t.addMedicine.searchResultsCount, { count: visibleResults.length })
          )}
        </p>
      )}

      <div className="space-y-2">
        {visibleResults.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => pick(d)}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-ink-100 bg-surface-card p-3 text-start hover:bg-primary-050"
          >
            <div className="flex items-center gap-3">
              <IconChip category={d.category ?? "other"} size="sm" />
              <div>
                <p className="text-h3 font-bold text-ink-900">{d.trade_name}</p>
                <p className="text-caption text-ink-500">{d.generic_name}</p>
              </div>
            </div>
            <Plus size={18} className="text-primary-700" />
          </button>
        ))}
      </div>
    </Screen>
  );
}
