"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAdminAction } from "@/lib/admin/audit";
import { TextAreaField, TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/locales";
import type { LegalDocument, LegalDocType } from "@/lib/supabase/types";
import type { Locale } from "@/lib/i18n/locales";

const DOC_TYPES: { value: LegalDocType; label: string }[] = [
  { value: "terms", label: "Terms & Conditions" },
  { value: "privacy", label: "Privacy Policy" },
];

export function LegalDocsManager({ initialDocs, canWrite }: { initialDocs: LegalDocument[]; canWrite: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [docs, setDocs] = useState(initialDocs);
  const [docType, setDocType] = useState<LegalDocType>("terms");
  const [locale, setLocale] = useState<Locale>("en");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const current = useMemo(
    () => docs.find((d) => d.doc_type === docType && d.locale === locale) ?? null,
    [docs, docType, locale],
  );

  const [content, setContent] = useState(current?.content ?? "");
  const [version, setVersion] = useState(current?.version ?? "1.0");

  function selectTab(nextType: LegalDocType, nextLocale: Locale) {
    setDocType(nextType);
    setLocale(nextLocale);
    const match = docs.find((d) => d.doc_type === nextType && d.locale === nextLocale);
    setContent(match?.content ?? "");
    setVersion(match?.version ?? "1.0");
    setSavedFlash(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: saveError } = await supabase
      .from("legal_documents")
      .upsert(
        { doc_type: docType, locale, content, version, updated_by: user?.id ?? null },
        { onConflict: "doc_type,locale" },
      )
      .select()
      .single();

    setSaving(false);
    if (saveError || !data) {
      setError(saveError?.message ?? "Failed to save.");
      return;
    }
    setDocs((prev) => [...prev.filter((d) => !(d.doc_type === docType && d.locale === locale)), data]);
    if (user) {
      await logAdminAction(supabase, user.id, "legal_document_update", "legal_documents", data.id, {
        doc_type: docType,
        locale,
        version,
      });
    }
    setSavedFlash(true);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {DOC_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => selectTab(t.value, locale)}
            className={
              docType === t.value
                ? "rounded-md bg-primary-900 px-3 py-2 text-bodys font-semibold text-white"
                : "rounded-md border border-ink-300 px-3 py-2 text-bodys text-ink-700"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {LOCALES.map((l) => {
          const has = docs.some((d) => d.doc_type === docType && d.locale === l);
          return (
            <button
              key={l}
              type="button"
              onClick={() => selectTab(docType, l)}
              className={
                locale === l
                  ? "rounded-pill bg-primary-100 px-3 py-1.5 text-bodys font-semibold text-primary-900"
                  : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
              }
            >
              {LOCALE_NAMES[l].english}
              {!has && <span className="ms-1 text-caption text-ink-500">(using default)</span>}
            </button>
          );
        })}
      </div>

      {!canWrite && (
        <p className="mb-3 text-bodys text-warning-700">
          You&apos;re signed in with the {""}
          <span className="font-semibold">viewer</span> role for legal content — only superadmins can edit these
          documents. You can still read them below.
        </p>
      )}

      <div className="space-y-4">
        <TextField label="Version" value={version} onChange={(e) => setVersion(e.target.value)} disabled={!canWrite} className="max-w-[10rem]" />
        <TextAreaField
          label={`${DOC_TYPES.find((t) => t.value === docType)?.label} — ${LOCALE_NAMES[locale].english}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!canWrite}
          rows={16}
        />
        {current && <p className="text-caption text-ink-500">Last updated {new Date(current.updated_at).toLocaleString()}</p>}
        {error && <p className="text-bodys text-danger-500">{error}</p>}
        {savedFlash && <p className="text-bodys font-medium text-success-700">Saved ✓</p>}
        {canWrite && (
          <Button onClick={save} disabled={saving} className="w-auto px-6">
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}
