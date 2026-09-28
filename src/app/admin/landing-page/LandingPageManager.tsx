"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAdminAction } from "@/lib/admin/audit";
import { TextField, TextAreaField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { LOCALE_NAMES } from "@/lib/i18n/locales";
import type { LandingLocale, LandingPageContentData } from "@/lib/supabase/types";

/** Sets a value at a dot-separated path (array indices are plain numeric
 * segments, e.g. "features.items.0.title") on a deep-cloned copy — small
 * hand-rolled helper since this form's shape is fixed and known, so a full
 * path-typed setter would be more code than it saves. */
function setPath<T extends object>(obj: T, path: string, value: string): T {
  const keys = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const next: any = structuredClone(obj);
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
  return next as T;
}

function getPath(obj: LandingPageContentData, path: string): string {
  return path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj) as string;
}

export function LandingPageManager({
  locales,
  initial,
  updatedAt,
  canWrite,
}: {
  locales: LandingLocale[];
  initial: Record<LandingLocale, LandingPageContentData>;
  updatedAt: Record<LandingLocale, string | null>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [contentByLocale, setContentByLocale] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const content = contentByLocale[locale];

  function update(path: string, value: string) {
    setContentByLocale((prev) => ({ ...prev, [locale]: setPath(prev[locale], path, value) }));
    setSavedFlash(false);
  }

  function selectLocale(next: LandingLocale) {
    setLocale(next);
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
      .from("landing_page_content")
      .upsert({ locale, content, updated_by: user?.id ?? null }, { onConflict: "locale" })
      .select()
      .single();

    setSaving(false);
    if (saveError || !data) {
      setError(saveError?.message ?? "Failed to save.");
      return;
    }
    if (user) {
      await logAdminAction(supabase, user.id, "landing_page_content_update", "landing_page_content", data.id, {
        locale,
      });
    }
    setSavedFlash(true);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => selectLocale(l)}
            className={
              locale === l
                ? "rounded-pill bg-primary-100 px-3 py-1.5 text-bodys font-semibold text-primary-900"
                : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
            }
          >
            {LOCALE_NAMES[l].english}
          </button>
        ))}
      </div>

      {!canWrite && (
        <p className="mb-4 text-bodys text-warning-700">
          You&apos;re signed in without superadmin access — only superadmins can edit the landing page. You can
          still read the current copy below.
        </p>
      )}

      {updatedAt[locale] && (
        <p className="mb-4 text-caption text-ink-500">
          Last updated {new Date(updatedAt[locale] as string).toLocaleString()}
        </p>
      )}

      <div className="space-y-8">
        <Section title="Navigation">
          <Row label="Brand name" value={getPath(content, "nav.brand")} onChange={(v) => update("nav.brand", v)} canWrite={canWrite} />
          <Row label={'"Features" link'} value={getPath(content, "nav.features")} onChange={(v) => update("nav.features", v)} canWrite={canWrite} />
          <Row label={'"How it works" link'} value={getPath(content, "nav.how")} onChange={(v) => update("nav.how", v)} canWrite={canWrite} />
          <Row label="Download button" value={getPath(content, "nav.cta")} onChange={(v) => update("nav.cta", v)} canWrite={canWrite} />
        </Section>

        <Section title="Hero">
          <Row label="Eyebrow label" value={getPath(content, "hero.eyebrow")} onChange={(v) => update("hero.eyebrow", v)} canWrite={canWrite} />
          <Row label="Headline — line 1" value={getPath(content, "hero.headlineLine1")} onChange={(v) => update("hero.headlineLine1", v)} canWrite={canWrite} />
          <Row label="Headline — highlighted line" value={getPath(content, "hero.headlineHighlight")} onChange={(v) => update("hero.headlineHighlight", v)} canWrite={canWrite} />
          <Row label="Supporting paragraph" value={getPath(content, "hero.lede")} onChange={(v) => update("hero.lede", v)} canWrite={canWrite} multiline />
          <Row label="Primary button" value={getPath(content, "hero.ctaPrimary")} onChange={(v) => update("hero.ctaPrimary", v)} canWrite={canWrite} />
          <Row label="Secondary link" value={getPath(content, "hero.ctaLink")} onChange={(v) => update("hero.ctaLink", v)} canWrite={canWrite} />
          <Row label="Note under buttons" value={getPath(content, "hero.note")} onChange={(v) => update("hero.note", v)} canWrite={canWrite} multiline />
        </Section>

        <Section title="Phone preview">
          <Row label="Greeting" value={getPath(content, "phone.greet")} onChange={(v) => update("phone.greet", v)} canWrite={canWrite} />
          <Row label="Example name" value={getPath(content, "phone.name")} onChange={(v) => update("phone.name", v)} canWrite={canWrite} />
          <Row label="Card title" value={getPath(content, "phone.heroTitle")} onChange={(v) => update("phone.heroTitle", v)} canWrite={canWrite} />
          <Row label="Card subtitle" value={getPath(content, "phone.heroSub")} onChange={(v) => update("phone.heroSub", v)} canWrite={canWrite} />
          <Row label="Card button" value={getPath(content, "phone.heroBtn")} onChange={(v) => update("phone.heroBtn", v)} canWrite={canWrite} />
          <Row label="Tracker title" value={getPath(content, "phone.ringTitle")} onChange={(v) => update("phone.ringTitle", v)} canWrite={canWrite} />
          <Row label="Tracker subtitle" value={getPath(content, "phone.ringSub")} onChange={(v) => update("phone.ringSub", v)} canWrite={canWrite} />
          <Row label={'"Taken" chip'} value={getPath(content, "phone.chip")} onChange={(v) => update("phone.chip", v)} canWrite={canWrite} />
        </Section>

        <Section title="Stats strip">
          <Row label="Medicines — value" value={getPath(content, "stats.medsValue")} onChange={(v) => update("stats.medsValue", v)} canWrite={canWrite} />
          <Row label="Medicines — label" value={getPath(content, "stats.medsLabel")} onChange={(v) => update("stats.medsLabel", v)} canWrite={canWrite} />
          <Row label="Interactions — value" value={getPath(content, "stats.interactionsValue")} onChange={(v) => update("stats.interactionsValue", v)} canWrite={canWrite} />
          <Row label="Interactions — label" value={getPath(content, "stats.interactionsLabel")} onChange={(v) => update("stats.interactionsLabel", v)} canWrite={canWrite} />
          <Row label="Languages — value" value={getPath(content, "stats.langsValue")} onChange={(v) => update("stats.langsValue", v)} canWrite={canWrite} />
          <Row label="Languages — label" value={getPath(content, "stats.langsLabel")} onChange={(v) => update("stats.langsLabel", v)} canWrite={canWrite} />
        </Section>

        <Section title="Features section">
          <Row label="Eyebrow label" value={getPath(content, "features.eyebrow")} onChange={(v) => update("features.eyebrow", v)} canWrite={canWrite} />
          <Row label="Heading" value={getPath(content, "features.h2")} onChange={(v) => update("features.h2", v)} canWrite={canWrite} />
          <Row label="Subheading" value={getPath(content, "features.p")} onChange={(v) => update("features.p", v)} canWrite={canWrite} multiline />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border border-ink-100 p-3">
              <p className="mb-2 text-caption font-semibold text-ink-500">Feature {i + 1}</p>
              <div className="space-y-3">
                <Row label="Title" value={getPath(content, `features.items.${i}.title`)} onChange={(v) => update(`features.items.${i}.title`, v)} canWrite={canWrite} />
                <Row label="Body" value={getPath(content, `features.items.${i}.body`)} onChange={(v) => update(`features.items.${i}.body`, v)} canWrite={canWrite} multiline />
              </div>
            </div>
          ))}
        </Section>

        <Section title="How it works">
          <Row label="Eyebrow label" value={getPath(content, "how.eyebrow")} onChange={(v) => update("how.eyebrow", v)} canWrite={canWrite} />
          <Row label="Heading" value={getPath(content, "how.h2")} onChange={(v) => update("how.h2", v)} canWrite={canWrite} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-md border border-ink-100 p-3">
              <p className="mb-2 text-caption font-semibold text-ink-500">Step {i + 1}</p>
              <div className="space-y-3">
                <Row label="Title" value={getPath(content, `how.steps.${i}.title`)} onChange={(v) => update(`how.steps.${i}.title`, v)} canWrite={canWrite} />
                <Row label="Body" value={getPath(content, `how.steps.${i}.body`)} onChange={(v) => update(`how.steps.${i}.body`, v)} canWrite={canWrite} multiline />
              </div>
            </div>
          ))}
        </Section>

        <Section title="Final call to action">
          <Row label="Heading" value={getPath(content, "final.h2")} onChange={(v) => update("final.h2", v)} canWrite={canWrite} />
          <Row label="Paragraph" value={getPath(content, "final.p")} onChange={(v) => update("final.p", v)} canWrite={canWrite} multiline />
          <Row label="Button" value={getPath(content, "final.cta")} onChange={(v) => update("final.cta", v)} canWrite={canWrite} />
        </Section>

        <Section title="Install instructions (shown after tapping the download button)">
          <Row label="Title" value={getPath(content, "install.h3")} onChange={(v) => update("install.h3", v)} canWrite={canWrite} />
          {[0, 1, 2].map((i) => (
            <Row
              key={i}
              label={`Step ${i + 1}`}
              value={getPath(content, `install.steps.${i}`)}
              onChange={(v) => update(`install.steps.${i}`, v)}
              canWrite={canWrite}
            />
          ))}
        </Section>

        <Section title="Footer">
          <Row label="Brand name" value={getPath(content, "footer.brand")} onChange={(v) => update("footer.brand", v)} canWrite={canWrite} />
          <Row label="Disclaimer" value={getPath(content, "footer.disclaimer")} onChange={(v) => update("footer.disclaimer", v)} canWrite={canWrite} multiline />
          <Row label="Copyright line" value={getPath(content, "footer.copy")} onChange={(v) => update("footer.copy", v)} canWrite={canWrite} />
        </Section>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-h3 font-bold text-ink-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
  canWrite,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  canWrite: boolean;
  multiline?: boolean;
}) {
  if (multiline) {
    return (
      <TextAreaField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!canWrite}
        rows={3}
      />
    );
  }
  return <TextField label={label} value={value} onChange={(e) => onChange(e.target.value)} disabled={!canWrite} />;
}
