import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Pulls every row from a table in chunks (PostgREST caps a single
 * response at ~1000 rows) — used for full-catalog CSV exports, where the
 * on-screen list is paginated but the download needs everything. */
export async function fetchAllRows<T>(
  supabase: SupabaseClient<Database>,
  table: "drugs" | "interactions",
  orderColumn: string,
): Promise<T[]> {
  const CHUNK = 1000;
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data } = await supabase
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: true })
      .range(from, from + CHUNK - 1);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < CHUNK) break;
    from += CHUNK;
  }
  return all;
}

/** e.g. versionedFilename("wasfati-drugs", 3) -> "wasfati-drugs-v3-2026-08-26.csv" */
export function versionedFilename(base: string, version: number) {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-v${version}-${date}.csv`;
}
