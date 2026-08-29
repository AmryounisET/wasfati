"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Upload, Download, Trash2, Pencil, SlidersHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAdminAction } from "@/lib/admin/audit";
import { parseSpreadsheet, findColumn, downloadCsv } from "@/lib/admin/parse-spreadsheet";
import { fetchAllRows, versionedFilename } from "@/lib/admin/export";
import { Modal } from "@/components/ui/Modal";
import { TextField, TextAreaField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import type { DataVersion, Interaction, InteractionType, Severity, Confidence } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

const TYPES: InteractionType[] = [
  "drug_drug",
  "duplicate_therapy",
  "contraindication",
  "food",
  "alcohol",
  "pregnancy",
  "breastfeeding",
  "elderly",
];
const SEVERITIES: Severity[] = ["low", "moderate", "high", "unverified"];
const CONFIDENCES: (Confidence | "")[] = ["", "high", "medium", "low"];

const severityVariant: Record<Severity, "danger" | "warning" | "primary" | "neutral"> = {
  high: "danger",
  moderate: "warning",
  low: "primary",
  unverified: "neutral",
};

type Draft = {
  substance_a: string;
  substance_b: string;
  interaction_type: InteractionType;
  severity: Severity;
  confidence: Confidence | "";
  mechanism: string;
  summary: string;
  patient_summary: string;
  citation: string;
};

const emptyDraft: Draft = {
  substance_a: "",
  substance_b: "",
  interaction_type: "drug_drug",
  severity: "unverified",
  confidence: "",
  mechanism: "",
  summary: "",
  patient_summary: "",
  citation: "",
};

type ParsedRow = Draft & { rowNum: number; problems: string[] };

export function InteractionsManager({
  initialRows,
  initialCount,
  initialVersion,
  canWrite,
}: {
  initialRows: Interaction[];
  initialCount: number;
  initialVersion: DataVersion | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(initialVersion);
  const [exporting, setExporting] = useState(false);

  async function bumpVersion(source: string) {
    const { data: newVersion } = await supabase.rpc("bump_data_version", {
      p_table_name: "interactions",
      p_source: source,
    });
    if (typeof newVersion === "number") {
      setVersion({
        table_name: "interactions",
        version: newVersion,
        updated_at: new Date().toISOString(),
        updated_by: null,
        source,
      });
    }
  }

  async function downloadAll() {
    setExporting(true);
    const all = await fetchAllRows<Interaction>(supabase, "interactions", "substance_a");
    downloadCsv(
      versionedFilename("wasfati-interactions", version?.version ?? 0),
      [
        "substance_a",
        "substance_b",
        "interaction_type",
        "severity",
        "summary",
        "patient_summary",
        "mechanism",
        "confidence",
        "citation",
      ],
      all.map((r) => [
        r.substance_a,
        r.substance_b ?? "",
        r.interaction_type,
        r.severity,
        r.summary,
        r.patient_summary ?? "",
        r.mechanism ?? "",
        r.confidence ?? "",
        r.citation ?? "",
      ]),
    );
    setExporting(false);
  }

  const [editing, setEditing] = useState<Interaction | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Interaction | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<Severity | "">("");
  const [typeFilter, setTypeFilter] = useState<InteractionType | "">("");

  const term = query.trim();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount = (severityFilter ? 1 : 0) + (typeFilter ? 1 : 0);

  async function loadPage(
    termValue: string,
    pageValue: number,
    severityValue: Severity | "",
    typeValue: InteractionType | "",
  ) {
    const from = (pageValue - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let q = supabase.from("interactions").select("*", { count: "exact" });
    if (termValue.length >= 2) {
      q = q.or(`substance_a.ilike.%${termValue}%,substance_b.ilike.%${termValue}%`);
    }
    if (severityValue) q = q.eq("severity", severityValue);
    if (typeValue) q = q.eq("interaction_type", typeValue);
    const { data, count } = await q.order("updated_at", { ascending: false }).range(from, to);
    setRows(data ?? []);
    setTotal(count ?? 0);
  }

  async function refetchList() {
    await loadPage(term, page, severityFilter, typeFilter);
  }

  function handleSeverityFilterChange(value: Severity | "") {
    setSeverityFilter(value);
    setPage(1);
    setLoading(true);
  }

  function handleTypeFilterChange(value: InteractionType | "") {
    setTypeFilter(value);
    setPage(1);
    setLoading(true);
  }

  function clearFilters() {
    setSeverityFilter("");
    setTypeFilter("");
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
      await loadPage(term, page, severityFilter, typeFilter);
      setLoading(false);
    }, term.length >= 2 ? 300 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, page, severityFilter, typeFilter]);

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
    setDraft(emptyDraft);
    setError(null);
    setEditing("new");
  }

  function openEdit(r: Interaction) {
    setDraft({
      substance_a: r.substance_a,
      substance_b: r.substance_b ?? "",
      interaction_type: r.interaction_type,
      severity: r.severity,
      confidence: r.confidence ?? "",
      mechanism: r.mechanism ?? "",
      summary: r.summary,
      patient_summary: r.patient_summary ?? "",
      citation: r.citation ?? "",
    });
    setError(null);
    setEditing(r);
  }

  async function saveDraft() {
    if (!draft.substance_a.trim() || !draft.summary.trim()) {
      setError("Substance A and the clinical summary are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      substance_a: draft.substance_a.trim().toLowerCase(),
      substance_b: draft.substance_b.trim() ? draft.substance_b.trim().toLowerCase() : null,
      interaction_type: draft.interaction_type,
      severity: draft.severity,
      confidence: draft.confidence || null,
      mechanism: draft.mechanism.trim() || null,
      summary: draft.summary.trim(),
      patient_summary: draft.patient_summary.trim() || null,
      citation: draft.citation.trim() || null,
    };

    if (editing === "new") {
      const { data, error: insertError } = await supabase.from("interactions").insert(payload).select().single();
      setSaving(false);
      if (insertError || !data) {
        setError(insertError?.message ?? "Failed to save.");
        return;
      }
      if (user) await logAdminAction(supabase, user.id, "interaction_create", "interactions", data.id, payload);
      await bumpVersion("manual_edit");
    } else if (editing) {
      const { error: updateError } = await supabase.from("interactions").update(payload).eq("id", editing.id);
      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      if (user) await logAdminAction(supabase, user.id, "interaction_update", "interactions", editing.id, payload);
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
    const { error: deleteError } = await supabase.from("interactions").delete().eq("id", target.id);
    if (deleteError) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAdminAction(supabase, user.id, "interaction_delete", "interactions", target.id, {
        substance_a: target.substance_a,
        substance_b: target.substance_b,
      });
    }
    await bumpVersion("manual_edit");
    setRows((prev) => prev.filter((r) => r.id !== target.id));
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
            placeholder="Search by substance name…"
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
              <Plus size={16} /> Add rule
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
            <span className="mb-1 block text-caption font-semibold text-ink-700">Severity</span>
            <select
              value={severityFilter}
              onChange={(e) => handleSeverityFilterChange(e.target.value as Severity | "")}
              className="h-9 rounded-md border border-ink-300 bg-surface-card px-2 text-bodys"
            >
              <option value="">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-caption font-semibold text-ink-700">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value as InteractionType | "")}
              className="h-9 rounded-md border border-ink-300 bg-surface-card px-2 text-bodys"
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
              <th className="px-3 py-2 text-start">Substance A</th>
              <th className="px-3 py-2 text-start">Substance B</th>
              <th className="px-3 py-2 text-start">Type</th>
              <th className="px-3 py-2 text-start">Severity</th>
              <th className="px-3 py-2 text-start">Summary</th>
              {canWrite && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-ink-500">
                  Searching…
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-100 align-top">
                  <td className="px-3 py-2 font-medium text-ink-900">{r.substance_a}</td>
                  <td className="px-3 py-2 text-ink-700">{r.substance_b ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-700">{r.interaction_type}</td>
                  <td className="px-3 py-2">
                    <Badge variant={severityVariant[r.severity]}>{r.severity}</Badge>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-ink-500" title={r.summary}>
                    {r.summary}
                  </td>
                  {canWrite && (
                    <td className="whitespace-nowrap px-3 py-2 text-end">
                      <button type="button" onClick={() => openEdit(r)} className="me-2 rounded-md p-1.5 text-primary-700 hover:bg-primary-050">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(r)} className="rounded-md p-1.5 text-danger-500 hover:bg-danger-050">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-500">
                  No rules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-center text-caption text-ink-500">
        {total} {total === 1 ? "rule" : "rules"} {term.length >= 2 ? "matching" : "total"} — page {page} of {totalPages}
      </p>
      <Pagination page={page} totalPages={totalPages} onChange={changePage} />

      <Modal open={!!confirmingDelete} onClose={() => setConfirmingDelete(null)} title="Delete interaction rule?">
        {confirmingDelete && (
          <div>
            <p className="mb-4 text-bodym text-ink-700">
              Delete the rule for{" "}
              <span className="font-semibold">
                {confirmingDelete.substance_a}
                {confirmingDelete.substance_b ? ` + ${confirmingDelete.substance_b}` : ""}
              </span>
              ? This stops new safety checks from catching it — past results already shown to users are unaffected.
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

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add interaction rule" : "Edit interaction rule"} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Substance A" value={draft.substance_a} onChange={(e) => setDraft((d) => ({ ...d, substance_a: e.target.value }))} />
            <TextField
              label="Substance B (optional)"
              value={draft.substance_b}
              onChange={(e) => setDraft((d) => ({ ...d, substance_b: e.target.value }))}
              placeholder="leave empty for pregnancy/elderly-type rules"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="mb-1.5 block text-bodym font-semibold text-ink-900">Type</span>
              <select
                value={draft.interaction_type}
                onChange={(e) => setDraft((d) => ({ ...d, interaction_type: e.target.value as InteractionType }))}
                className="h-10 w-full rounded-md border border-ink-300 bg-surface-card px-2 text-bodys"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1.5 block text-bodym font-semibold text-ink-900">Severity</span>
              <select
                value={draft.severity}
                onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value as Severity }))}
                className="h-10 w-full rounded-md border border-ink-300 bg-surface-card px-2 text-bodys"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1.5 block text-bodym font-semibold text-ink-900">Confidence</span>
              <select
                value={draft.confidence}
                onChange={(e) => setDraft((d) => ({ ...d, confidence: e.target.value as Confidence | "" }))}
                className="h-10 w-full rounded-md border border-ink-300 bg-surface-card px-2 text-bodys"
              >
                {CONFIDENCES.map((c) => (
                  <option key={c || "none"} value={c}>
                    {c || "—"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <TextField label="Mechanism (optional)" value={draft.mechanism} onChange={(e) => setDraft((d) => ({ ...d, mechanism: e.target.value }))} />
          <TextAreaField
            label="Summary (student / provider — full clinical wording)"
            value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
            rows={3}
          />
          <TextAreaField
            label="Patient summary (optional — brief, plain language)"
            value={draft.patient_summary}
            onChange={(e) => setDraft((d) => ({ ...d, patient_summary: e.target.value }))}
            rows={2}
          />
          <TextField label="Citation / source (optional)" value={draft.citation} onChange={(e) => setDraft((d) => ({ ...d, citation: e.target.value }))} />

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
          loadPage(term, 1, severityFilter, typeFilter);
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
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRows([]);
    setFileName("");
    setResult(null);
    setError(null);
    setProgress("");
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    setParsing(true);
    try {
      const raw = await parseSpreadsheet(file);
      const seen = new Set<string>();
      const parsed: ParsedRow[] = raw.map((r, i) => {
        const substance_a = findColumn(r, ["substance_a", "generic drug a", "drug a", "substance a"]).toLowerCase();
        const substance_b = findColumn(r, ["substance_b", "generic drug b", "drug b", "substance b"]).toLowerCase();
        const interaction_type = (findColumn(r, ["interaction_type", "type"]) || "drug_drug") as InteractionType;
        const severityRaw = findColumn(r, ["severity"]).toLowerCase();
        const severity: Severity = (["low", "moderate", "high", "unverified"] as const).includes(severityRaw as Severity)
          ? (severityRaw as Severity)
          : "unverified";
        const confidenceRaw = findColumn(r, ["confidence"]).toLowerCase();
        const confidence = (["high", "medium", "low"] as const).includes(confidenceRaw as Confidence)
          ? (confidenceRaw as Confidence)
          : "";
        const mechanism = findColumn(r, ["mechanism", "interaction type description"]);
        const summary = findColumn(r, ["summary", "student/provider message", "student message"]);
        const patient_summary = findColumn(r, ["patient_summary", "patient message"]);
        const citation = findColumn(r, ["citation", "source"]);

        const problems: string[] = [];
        if (!substance_a) problems.push("missing substance A");
        if (!summary) problems.push("missing summary");
        if (!TYPES.includes(interaction_type)) problems.push(`unknown type "${interaction_type}"`);
        const key = `${substance_a}|||${substance_b}|||${interaction_type}`;
        if (substance_a && seen.has(key)) problems.push("duplicate row in file");
        else if (substance_a) seen.add(key);

        return {
          rowNum: i + 2,
          substance_a,
          substance_b,
          interaction_type,
          severity,
          confidence,
          mechanism,
          summary,
          patient_summary,
          citation,
          problems,
        };
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

    // Only pull existing rules that could possibly collide with this
    // upload (matching on substance name), not the whole 40k+ table —
    // PostgREST's upsert onConflict can't target the functional unique
    // index on (substance_a, coalesce(substance_b,''), interaction_type)
    // directly, so the match has to happen here instead.
    const involved = [...new Set(valid.flatMap((r) => [r.substance_a, r.substance_b].filter(Boolean)))];
    setProgress("Checking for existing rules…");
    const [{ data: byA }, { data: byB }] = await Promise.all([
      supabase.from("interactions").select("id, substance_a, substance_b, interaction_type").in("substance_a", involved),
      supabase.from("interactions").select("id, substance_a, substance_b, interaction_type").in("substance_b", involved),
    ]);
    const existingByKey = new Map<string, string>();
    for (const row of [...(byA ?? []), ...(byB ?? [])]) {
      existingByKey.set(`${row.substance_a}|||${row.substance_b ?? ""}|||${row.interaction_type}`, row.id);
    }

    type Payload = {
      substance_a: string;
      substance_b: string | null;
      interaction_type: InteractionType;
      severity: Severity;
      confidence: Confidence | null;
      mechanism: string | null;
      summary: string;
      patient_summary: string | null;
      citation: string | null;
    };
    const toUpdate: (Payload & { id: string })[] = [];
    const toInsert: Payload[] = [];
    for (const r of valid) {
      const payload: Payload = {
        substance_a: r.substance_a,
        substance_b: r.substance_b || null,
        interaction_type: r.interaction_type,
        severity: r.severity,
        confidence: r.confidence || null,
        mechanism: r.mechanism || null,
        summary: r.summary,
        patient_summary: r.patient_summary || null,
        citation: r.citation || null,
      };
      const key = `${r.substance_a}|||${r.substance_b}|||${r.interaction_type}`;
      const existingId = existingByKey.get(key);
      if (existingId) toUpdate.push({ ...payload, id: existingId });
      else toInsert.push(payload);
    }

    const CHUNK = 500;
    let failed = 0;
    setProgress(`Uploading ${toInsert.length + toUpdate.length} rows…`);
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const { error: upsertError } = await supabase.from("interactions").upsert(toUpdate.slice(i, i + CHUNK), { onConflict: "id" });
      if (upsertError) failed += toUpdate.slice(i, i + CHUNK).length;
    }
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const { error: insertError } = await supabase.from("interactions").insert(toInsert.slice(i, i + CHUNK));
      if (insertError) failed += toInsert.slice(i, i + CHUNK).length;
    }

    setUploading(false);
    setProgress("");
    setResult(`Done: ${toInsert.length} added, ${toUpdate.length} updated${failed ? `, ${failed} failed` : ""}.`);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAdminAction(supabase, user.id, "interactions_bulk_upload", "interactions", null, {
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
      title="Bulk upload interaction rules"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md bg-primary-050 p-3">
          <p className="text-bodys text-primary-900">
            Columns: <span className="font-mono">substance_a</span>, <span className="font-mono">substance_b</span>{" "}
            (optional), <span className="font-mono">interaction_type</span>, <span className="font-mono">severity</span>,{" "}
            <span className="font-mono">summary</span>, <span className="font-mono">patient_summary</span>,{" "}
            <span className="font-mono">mechanism</span>, <span className="font-mono">confidence</span>,{" "}
            <span className="font-mono">citation</span>. Matching (substance_a, substance_b, type) rows are
            updated; new ones are added.
          </p>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "interactions_template.csv",
                ["substance_a", "substance_b", "interaction_type", "severity", "summary", "patient_summary", "mechanism", "confidence", "citation"],
                [
                  [
                    "warfarin",
                    "aspirin",
                    "drug_drug",
                    "high",
                    "Concurrent use significantly increases bleeding risk via additive anticoagulant/antiplatelet effects.",
                    "Taking these together raises your risk of serious bleeding. Talk to your doctor before combining them.",
                    "Additive antiplatelet + anticoagulant effect",
                    "high",
                    "",
                  ],
                ],
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
                    <th className="px-2 py-1 text-start">A</th>
                    <th className="px-2 py-1 text-start">B</th>
                    <th className="px-2 py-1 text-start">Severity</th>
                    <th className="px-2 py-1 text-start">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r) => (
                    <tr key={r.rowNum} className={r.problems.length ? "bg-danger-050" : undefined}>
                      <td className="px-2 py-1 text-ink-500">{r.rowNum}</td>
                      <td className="px-2 py-1">{r.substance_a || "—"}</td>
                      <td className="px-2 py-1">{r.substance_b || "—"}</td>
                      <td className="px-2 py-1">{r.severity}</td>
                      <td className="px-2 py-1 text-danger-500">{r.problems.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {progress && <p className="text-bodys text-ink-500">{progress}</p>}
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
