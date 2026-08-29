"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Upload, Download, Trash2, Pencil, SlidersHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAdminAction } from "@/lib/admin/audit";
import { parseSpreadsheet, findColumn, downloadCsv } from "@/lib/admin/parse-spreadsheet";
import { fetchAllRows, versionedFilename } from "@/lib/admin/export";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import type { DataVersion, Drug } from "@/lib/supabase/types";
import type { MedicationCategory } from "@/components/ui/IconChip";

const CATEGORIES: MedicationCategory[] = [
  "other",
  "heart",
  "diabetes",
  "pain",
  "antibiotic",
  "stomach",
  "cholesterol",
];
const PAGE_SIZE = 50;

type DraftRow = { trade_name: string; generic_name: string; category: string; common_dose: string };
type ParsedRow = DraftRow & { rowNum: number; problems: string[] };

export function DrugsManager({
  initialDrugs,
  initialCount,
  initialVersion,
  canWrite,
}: {
  initialDrugs: Drug[];
  initialCount: number;
  initialVersion: DataVersion | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [drugs, setDrugs] = useState(initialDrugs);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(initialVersion);
  const [exporting, setExporting] = useState(false);

  async function bumpVersion(source: string) {
    const { data: newVersion } = await supabase.rpc("bump_data_version", {
      p_table_name: "drugs",
      p_source: source,
    });
    if (typeof newVersion === "number") {
      setVersion({ table_name: "drugs", version: newVersion, updated_at: new Date().toISOString(), updated_by: null, source });
    }
  }

  async function downloadAll() {
    setExporting(true);
    const all = await fetchAllRows<Drug>(supabase, "drugs", "trade_name");
    downloadCsv(
      versionedFilename("wasfati-drugs", version?.version ?? 0),
      ["trade_name", "generic_name", "category", "common_dose"],
      all.map((d) => [d.trade_name, d.generic_name, d.category, d.common_dose ?? ""]),
    );
    setExporting(false);
  }

  const [editing, setEditing] = useState<Drug | "new" | null>(null);
  const [draft, setDraft] = useState<DraftRow>({ trade_name: "", generic_name: "", category: "other", common_dose: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Drug | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  const term = query.trim();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount = categoryFilter ? 1 : 0;

  async function loadPage(termValue: string, pageValue: number, categoryValue: string) {
    const from = (pageValue - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let q = supabase.from("drugs").select("*", { count: "exact" });
    if (termValue.length >= 2) {
      q = q.or(`trade_name.ilike.%${termValue}%,generic_name.ilike.%${termValue}%`);
    }
    if (categoryValue) {
      q = q.eq("category", categoryValue);
    }
    const { data, count } = await q.order("trade_name", { ascending: true }).range(from, to);
    setDrugs(data ?? []);
    setTotal(count ?? 0);
  }

  async function refetchList() {
    await loadPage(term, page, categoryFilter);
  }

  function handleCategoryFilterChange(value: string) {
    setCategoryFilter(value);
    setPage(1);
    setLoading(true);
  }

  function clearFilters() {
    setCategoryFilter("");
    setPage(1);
    setLoading(true);
  }

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = setTimeout(async () => {
      await loadPage(term, page, categoryFilter);
      setLoading(false);
    }, term.length >= 2 ? 300 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, page, categoryFilter]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
    setLoading(true);
  }

  function changePage(next: number) {
    setPage(next);
    setLoading(true);
  }

  function openNew() {
    setDraft({ trade_name: "", generic_name: "", category: "other", common_dose: "" });
    setError(null);
    setEditing("new");
  }

  function openEdit(d: Drug) {
    setDraft({ trade_name: d.trade_name, generic_name: d.generic_name, category: d.category, common_dose: d.common_dose ?? "" });
    setError(null);
    setEditing(d);
  }

  async function saveDraft() {
    if (!draft.trade_name.trim() || !draft.generic_name.trim()) {
      setError("Trade name and generic name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (editing === "new") {
      const { data, error: insertError } = await supabase
        .from("drugs")
        .insert({
          trade_name: draft.trade_name.trim(),
          generic_name: draft.generic_name.trim().toLowerCase(),
          category: draft.category,
          common_dose: draft.common_dose.trim() || null,
        })
        .select()
        .single();
      setSaving(false);
      if (insertError || !data) {
        setError(insertError?.message ?? "Failed to save.");
        return;
      }
      if (user) await logAdminAction(supabase, user.id, "drug_create", "drugs", data.id, { trade_name: data.trade_name });
      await bumpVersion("manual_edit");
    } else if (editing) {
      const { error: updateError } = await supabase
        .from("drugs")
        .update({
          trade_name: draft.trade_name.trim(),
          generic_name: draft.generic_name.trim().toLowerCase(),
          category: draft.category,
          common_dose: draft.common_dose.trim() || null,
        })
        .eq("id", editing.id);
      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      if (user) await logAdminAction(supabase, user.id, "drug_update", "drugs", editing.id, { trade_name: draft.trade_name });
      await bumpVersion("manual_edit");
    }
    setEditing(null);
    router.refresh();
    await refetchList();
  }

  async function confirmDelete() {
    if (!confirmingDelete) return;
    const target = confirmingDelete;
    setConfirmingDelete(null);
    const { error: deleteError } = await supabase.from("drugs").delete().eq("id", target.id);
    if (deleteError) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await logAdminAction(supabase, user.id, "drug_delete", "drugs", target.id, { trade_name: target.trade_name });
    await bumpVersion("manual_edit");
    setDrugs((prev) => prev.filter((d) => d.id !== target.id));
    setTotal((prev) => Math.max(0, prev - 1));
    router.refresh();
  }

  return (
    <div>
      {version && (
        <p className="mb-3 text-caption text-ink-500">
          Data version <span className="font-semibold text-ink-700">v{version.version}</span> · updated{" "}
          {new Date(version.updated_at).toLocaleString()}
          {version.source && ` (${version.source.replace(/_/g, " ")})`}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-500" size={16} />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search trade or generic name…"
            className="h-10 w-full rounded-md border border-ink-300 bg-surface-card ps-3 pe-9 text-bodys focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <Button
          size="md"
          variant="outline"
          onClick={() => setFiltersOpen((v) => !v)}
          className="relative w-auto px-4"
        >
          <SlidersHorizontal size={16} /> Filters
          {activeFilterCount > 0 && (
            <span className="absolute -end-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-900 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button size="md" variant="outline" onClick={downloadAll} disabled={exporting} className="w-auto px-4">
          <Download size={16} /> {exporting ? "Exporting…" : "Download"}
        </Button>
        {canWrite && (
          <>
            <Button size="md" onClick={openNew} className="w-auto px-4">
              <Plus size={16} /> Add drug
            </Button>
            <Button size="md" variant="outline" onClick={() => setUploadOpen(true)} className="w-auto px-4">
              <Upload size={16} /> Bulk upload
            </Button>
          </>
        )}
      </div>

      {filtersOpen && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-ink-100 bg-ink-100/40 p-3">
          <div>
            <span className="mb-1 block text-caption font-semibold text-ink-700">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="h-9 rounded-md border border-ink-300 bg-surface-card px-2 text-bodys"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-bodys font-medium text-primary-700 hover:bg-primary-050"
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-ink-100">
        <table className="w-full text-start text-bodys">
          <thead className="bg-ink-100 text-caption font-semibold text-ink-500">
            <tr>
              <th className="px-3 py-2 text-start">Trade name</th>
              <th className="px-3 py-2 text-start">Generic name</th>
              <th className="px-3 py-2 text-start">Category</th>
              <th className="px-3 py-2 text-start">Common dose</th>
              {canWrite && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-ink-500">
                  Searching…
                </td>
              </tr>
            )}
            {!loading &&
              drugs.map((d) => (
                <tr key={d.id} className="border-t border-ink-100">
                  <td className="px-3 py-2 font-medium text-ink-900">{d.trade_name}</td>
                  <td className="px-3 py-2 text-ink-700">{d.generic_name}</td>
                  <td className="px-3 py-2 capitalize text-ink-700">{d.category}</td>
                  <td className="px-3 py-2 text-ink-500">{d.common_dose || "—"}</td>
                  {canWrite && (
                    <td className="whitespace-nowrap px-3 py-2 text-end">
                      <button type="button" onClick={() => openEdit(d)} className="me-2 rounded-md p-1.5 text-primary-700 hover:bg-primary-050">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(d)} className="rounded-md p-1.5 text-danger-500 hover:bg-danger-050">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            {!loading && drugs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink-500">
                  No drugs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-center text-caption text-ink-500">
        {total} {total === 1 ? "drug" : "drugs"} {term.length >= 2 ? "matching" : "total"} — page {page} of {totalPages}
      </p>
      <Pagination page={page} totalPages={totalPages} onChange={changePage} />

      <Modal open={!!confirmingDelete} onClose={() => setConfirmingDelete(null)} title="Delete drug?">
        {confirmingDelete && (
          <div>
            <p className="mb-4 text-bodym text-ink-700">
              Delete <span className="font-semibold">{confirmingDelete.trade_name}</span> from the catalog? Users
              won&apos;t be able to find it in search anymore, but medicines already logged by users are unaffected.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="md" onClick={() => setConfirmingDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add drug" : "Edit drug"}>
        <div className="space-y-4">
          <TextField label="Trade name" value={draft.trade_name} onChange={(e) => setDraft((d) => ({ ...d, trade_name: e.target.value }))} />
          <TextField
            label="Generic name"
            value={draft.generic_name}
            onChange={(e) => setDraft((d) => ({ ...d, generic_name: e.target.value }))}
            placeholder="e.g. paracetamol or paracetamol+caffeine for combinations"
          />
          <div>
            <span className="mb-1.5 block text-bodym font-semibold text-ink-900">Category</span>
            <select
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              className="h-10 w-full rounded-md border border-ink-300 bg-surface-card px-3 text-bodys"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Common dose (optional)"
            value={draft.common_dose}
            onChange={(e) => setDraft((d) => ({ ...d, common_dose: e.target.value }))}
            placeholder="e.g. 500mg"
          />
          {error && <p className="text-bodys text-danger-500">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="md" onClick={saveDraft} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <BulkUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onDone={async () => {
          await bumpVersion("bulk_upload");
          router.refresh();
          setPage(1);
          loadPage(term, 1, categoryFilter);
        }}
      />
    </div>
  );
}

function BulkUploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const supabase = createClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRows([]);
    setFileName("");
    setResult(null);
    setError(null);
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    setParsing(true);
    try {
      const raw = await parseSpreadsheet(file);
      const seen = new Map<string, number>();
      const parsed: ParsedRow[] = raw.map((r, i) => {
        const trade_name = findColumn(r, ["trade_name", "trade name", "brand name", "product name", "name"]);
        const generic_name = findColumn(r, ["generic_name", "generic name", "active ingredient", "ingredient"]);
        const category = findColumn(r, ["category", "type"]) || "other";
        const common_dose = findColumn(r, ["common_dose", "dose", "strength"]);
        const problems: string[] = [];
        if (!trade_name) problems.push("missing trade name");
        if (!generic_name) problems.push("missing generic name");
        const key = trade_name.toLowerCase();
        if (trade_name && seen.has(key)) problems.push(`duplicate of row ${seen.get(key)}`);
        else if (trade_name) seen.set(key, i + 2);
        return { rowNum: i + 2, trade_name, generic_name: generic_name.toLowerCase(), category, common_dose, problems };
      });
      setRows(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
    }
    setParsing(false);
  }

  async function confirmUpload() {
    const valid = rows.filter((r) => r.problems.length === 0);
    if (valid.length === 0) return;
    setUploading(true);
    setError(null);

    // Resolve insert vs update by matching lower(trade_name) against the
    // full existing catalog (small enough — a few thousand rows — to pull
    // once client-side; PostgREST's upsert onConflict can't target the
    // functional unique index on lower(trade_name) directly).
    const { data: existing } = await supabase.from("drugs").select("id, trade_name");
    const existingByKey = new Map((existing ?? []).map((d) => [d.trade_name.toLowerCase(), d.id]));

    const toUpdate = valid
      .filter((r) => existingByKey.has(r.trade_name.toLowerCase()))
      .map((r) => ({
        id: existingByKey.get(r.trade_name.toLowerCase())!,
        trade_name: r.trade_name,
        generic_name: r.generic_name,
        category: r.category,
        common_dose: r.common_dose || null,
      }));
    const toInsert = valid
      .filter((r) => !existingByKey.has(r.trade_name.toLowerCase()))
      .map((r) => ({
        trade_name: r.trade_name,
        generic_name: r.generic_name,
        category: r.category,
        common_dose: r.common_dose || null,
      }));

    const CHUNK = 500;
    let failed = 0;
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const { error: upsertError } = await supabase.from("drugs").upsert(toUpdate.slice(i, i + CHUNK), { onConflict: "id" });
      if (upsertError) failed += toUpdate.slice(i, i + CHUNK).length;
    }
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const { error: insertError } = await supabase.from("drugs").insert(toInsert.slice(i, i + CHUNK));
      if (insertError) failed += toInsert.slice(i, i + CHUNK).length;
    }

    setUploading(false);
    setResult(`Done: ${toInsert.length} added, ${toUpdate.length} updated${failed ? `, ${failed} failed` : ""}.`);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAdminAction(supabase, user.id, "drugs_bulk_upload", "drugs", null, {
        file: fileName,
        added: toInsert.length,
        updated: toUpdate.length,
        failed,
      });
    }
    onDone();
  }

  const validCount = rows.filter((r) => r.problems.length === 0).length;
  const invalidCount = rows.length - validCount;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Bulk upload drugs"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md bg-primary-050 p-3">
          <p className="text-bodys text-primary-900">
            Columns: <span className="font-mono">trade_name</span>, <span className="font-mono">generic_name</span>,{" "}
            <span className="font-mono">category</span> (optional), <span className="font-mono">common_dose</span>{" "}
            (optional). Existing trade names are updated in place; new ones are added.
          </p>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "drugs_template.csv",
                ["trade_name", "generic_name", "category", "common_dose"],
                [["Panadol", "paracetamol", "pain", "500mg"]],
              )
            }
            className="flex shrink-0 items-center gap-1 text-caption font-semibold text-primary-700"
          >
            <Download size={14} /> Template
          </button>
        </div>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block w-full text-bodys"
        />

        {parsing && <p className="text-bodys text-ink-500">Parsing…</p>}
        {error && <p className="text-bodys text-danger-500">{error}</p>}

        {rows.length > 0 && !parsing && (
          <div>
            <p className="mb-2 text-bodys text-ink-700">
              {rows.length} rows parsed — <span className="font-semibold text-success-700">{validCount} valid</span>
              {invalidCount > 0 && (
                <>
                  , <span className="font-semibold text-danger-500">{invalidCount} with problems (skipped)</span>
                </>
              )}
            </p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-ink-100">
              <table className="w-full text-start text-caption">
                <thead className="sticky top-0 bg-ink-100 text-ink-500">
                  <tr>
                    <th className="px-2 py-1 text-start">Row</th>
                    <th className="px-2 py-1 text-start">Trade name</th>
                    <th className="px-2 py-1 text-start">Generic name</th>
                    <th className="px-2 py-1 text-start">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r) => (
                    <tr key={r.rowNum} className={r.problems.length ? "bg-danger-050" : undefined}>
                      <td className="px-2 py-1 text-ink-500">{r.rowNum}</td>
                      <td className="px-2 py-1">{r.trade_name || "—"}</td>
                      <td className="px-2 py-1">{r.generic_name || "—"}</td>
                      <td className="px-2 py-1 text-danger-500">{r.problems.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && <p className="text-bodys font-medium text-success-700">{result}</p>}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Close
          </Button>
          <Button size="md" onClick={confirmUpload} disabled={validCount === 0 || uploading}>
            {uploading ? "Uploading…" : `Upload ${validCount} rows`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
