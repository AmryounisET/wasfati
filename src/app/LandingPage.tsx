import Image from "next/image";
import { ShieldCheck, Bell, Users, MessageCircle } from "lucide-react";
import { LandingLangToggle } from "./LandingLangToggle";
import { LandingInstallCta } from "./LandingInstallCta";
import type { LandingPageContentData } from "@/lib/supabase/types";

const FEATURE_ICONS = [ShieldCheck, Bell, Users, MessageCircle] as const;
const FEATURE_CHIP_CLASS = [
  "bg-gradient-to-br from-primary-500 to-primary-900",
  "bg-gradient-to-br from-coral-600 to-coral-deep",
  "bg-category-sky",
  "bg-category-violet",
];

export function LandingPage({ content: c }: { content: LandingPageContentData; locale: "en" | "ar" }) {
  return (
    <div className="min-h-full bg-surface-app">
      <LandingLangToggle />

      <nav className="sticky top-0 z-40 border-b border-ink-100 bg-surface-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <a href="#top" className="flex items-center gap-2.5">
            <Image src="/icons/logo-mark-teal.png" alt="" width={34} height={34} className="rounded-md" />
            <span style={{ fontFamily: "var(--font-display)" }} className="text-[19px] font-bold text-ink-900">
              {c.nav.brand}
            </span>
          </a>
          <div className="hidden items-center gap-7 text-bodym font-semibold text-ink-700 sm:flex">
            <a href="#features" className="hover:text-primary-700">
              {c.nav.features}
            </a>
            <a href="#how" className="hover:text-primary-700">
              {c.nav.how}
            </a>
          </div>
          <a
            href="#get-started"
            className="rounded-pill bg-gradient-to-br from-coral-600 to-coral-deep px-4 py-2 text-bodys font-bold text-white shadow-[0_10px_22px_-10px_rgba(181,53,15,0.5)]"
          >
            {c.nav.cta}
          </a>
        </div>
      </nav>

      <header id="top" className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-[#0f4a3a] to-[#0d4436]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(480px 320px at 85% -10%, rgba(47,190,143,0.35), transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-[1.05fr_0.8fr] md:items-center md:py-20">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[12.5px] font-bold tracking-wide text-primary-300 uppercase rtl:tracking-normal rtl:normal-case">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-300" />
              {c.hero.eyebrow}
            </div>
            <h1
              style={{ fontFamily: "var(--font-display)" }}
              className="mt-3.5 text-4xl leading-[1.1] font-bold text-white sm:text-5xl lg:text-6xl"
            >
              {c.hero.headlineLine1}
              <br />
              <span className="text-primary-300">{c.hero.headlineHighlight}</span>
            </h1>
            <p className="mt-4.5 max-w-[46ch] text-bodyl leading-relaxed text-white/80">{c.hero.lede}</p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <a
                href="#get-started"
                className="rounded-pill bg-gradient-to-br from-coral-600 to-coral-deep px-7 py-4 text-bodyl font-bold text-white shadow-[0_14px_30px_-10px_rgba(181,53,15,0.5)]"
              >
                {c.hero.ctaPrimary}
              </a>
              <a href="#how" className="border-b-[1.5px] border-white/45 pb-0.5 text-bodyl font-bold text-white">
                {c.hero.ctaLink}
              </a>
            </div>
            <p className="mt-5 text-bodys text-white/55">{c.hero.note}</p>
          </div>

          <div className="mx-auto w-[260px] rounded-[38px] bg-[#061a14] p-2.5 shadow-[0_40px_70px_-30px_rgba(0,0,0,0.6)]" aria-hidden>
            <div className="min-h-[420px] overflow-hidden rounded-[28px] bg-surface-app px-3.5 pt-4 pb-3.5">
              <p className="text-[11px] font-semibold text-ink-500">{c.phone.greet}</p>
              <p style={{ fontFamily: "var(--font-display)" }} className="mt-0.5 text-[17px] font-bold text-ink-900">
                {c.phone.name}
              </p>

              <div className="mt-3.5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-900 p-3.5 text-white">
                <b style={{ fontFamily: "var(--font-display)" }} className="block text-[13.5px]">
                  {c.phone.heroTitle}
                </b>
                <small className="mt-0.5 block text-[11px] opacity-80">{c.phone.heroSub}</small>
                <div className="mt-2.5 rounded-md bg-white py-1.5 text-center text-[11.5px] font-bold text-primary-900">
                  {c.phone.heroBtn}
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-2.5 rounded-2xl bg-white p-2.5">
                <span
                  className="h-[38px] w-[38px] shrink-0 rounded-full"
                  style={{ background: "conic-gradient(var(--color-primary-500) 0 70%, var(--color-ink-100) 0)" }}
                >
                  <span className="m-[5px] block h-7 w-7 rounded-full bg-white" />
                </span>
                <div>
                  <b className="block text-[11.5px] text-ink-900">{c.phone.ringTitle}</b>
                  <span className="text-[10px] text-ink-500">{c.phone.ringSub}</span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl bg-white p-2.5">
                <div>
                  <b className="block text-[11.5px] text-ink-900">Atrovent</b>
                  <span className="text-[10px] text-ink-500">ipratropium 300mg</span>
                </div>
                <span className="shrink-0 rounded-pill bg-primary-500 px-2 py-1 text-[9.5px] font-bold whitespace-nowrap text-white">
                  {c.phone.chip}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl bg-white p-2.5">
                <div>
                  <b className="block text-[11.5px] text-ink-900">Brufen</b>
                  <span className="text-[10px] text-ink-500">ibuprofen 400mg</span>
                </div>
                <span className="shrink-0 rounded-pill bg-primary-500 px-2 py-1 text-[9.5px] font-bold whitespace-nowrap text-white">
                  {c.phone.chip}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-ink-100 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-5 px-6 text-center">
          <Stat value={c.stats.medsValue} label={c.stats.medsLabel} />
          <Stat value={c.stats.interactionsValue} label={c.stats.interactionsLabel} />
          <Stat value={c.stats.langsValue} label={c.stats.langsLabel} />
        </div>
      </section>

      <section id="features" className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHead eyebrow={c.features.eyebrow} h2={c.features.h2} p={c.features.p} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.features.items.map((item, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={item.title} className="rounded-xl border border-ink-100 bg-surface-card p-5 shadow-[0_10px_28px_-14px_rgba(11,61,48,0.25)]">
                  <span className={`mb-3.5 flex h-11 w-11 items-center justify-center rounded-md text-white ${FEATURE_CHIP_CLASS[i]}`}>
                    <Icon size={21} />
                  </span>
                  <h3 className="text-h3 font-bold text-ink-900">{item.title}</h3>
                  <p className="mt-1.5 text-bodys leading-relaxed text-ink-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how" className="bg-primary-050 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHead eyebrow={c.how.eyebrow} h2={c.how.h2} />
          <div className="grid gap-8 md:grid-cols-3">
            {c.how.steps.map((step, i) => (
              <div key={step.title}>
                <span style={{ fontFamily: "var(--font-display)" }} className="text-[34px] leading-none font-extrabold text-primary-100">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2.5 text-bodyl font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-bodym leading-relaxed text-ink-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="get-started" className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-primary-900 to-[#0d4436] px-8 py-12 text-center">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(360px 220px at 15% 110%, rgba(255,106,77,0.28), transparent 70%)" }}
            />
            <h2 style={{ fontFamily: "var(--font-display)" }} className="relative text-3xl font-bold text-white sm:text-4xl">
              {c.final.h2}
            </h2>
            <p className="relative mx-auto mt-2.5 max-w-[52ch] text-bodyl text-white/75">{c.final.p}</p>
            <LandingInstallCta ctaLabel={c.final.cta} installTitle={c.install.h3} installSteps={c.install.steps} />
          </div>
        </div>
      </section>

      <footer className="bg-primary-900 py-10 text-white/65">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <Image src="/icons/logo-mark-white.png" alt="" width={28} height={28} className="rounded-md" />
              <span style={{ fontFamily: "var(--font-display)" }} className="text-[16px] font-bold text-white">
                {c.footer.brand}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["العربية", "English", "Español", "Français", "Italiano", "Русский", "Türkçe", "中文"].map((l) => (
                <span key={l} className="rounded-pill bg-white/10 px-2.5 py-1 text-caption font-semibold">
                  {l}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-6 border-t border-white/15 pt-5 text-bodys leading-relaxed">{c.footer.disclaimer}</p>
          <p className="mt-3.5 text-caption text-white/45">{c.footer.copy}</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b style={{ fontFamily: "var(--font-display)" }} className="block text-2xl font-bold text-primary-900 sm:text-3xl">
        {value}
      </b>
      <span className="text-bodys font-semibold text-ink-500">{label}</span>
    </div>
  );
}

function SectionHead({ eyebrow, h2, p }: { eyebrow: string; h2: string; p?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-xl text-center">
      <div className="text-[12.5px] font-bold tracking-wide text-primary-700 uppercase rtl:tracking-normal rtl:normal-case">{eyebrow}</div>
      <h2 style={{ fontFamily: "var(--font-display)" }} className="mt-2.5 text-2xl font-bold text-ink-900 sm:text-3xl">
        {h2}
      </h2>
      {p && <p className="mt-3 text-bodyl leading-relaxed text-ink-500">{p}</p>}
    </div>
  );
}
