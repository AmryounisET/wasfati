import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Baloo_2, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { getLocale } from "@/lib/i18n/get-locale";
import { dirForLocale } from "@/lib/i18n/locales";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Body/Latin text — replaces Inter under the new design theme.
const plexJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin", "cyrillic-ext"],
  display: "swap",
});

// Headings only (h1/h2/h3, see globals.css) — Baloo 2 has no Arabic glyphs,
// so Arabic heading text still falls through to plexArabic via the
// --font-display stack instead of a generic system fallback.
const baloo = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// Numeric/tabular contexts (e.g. dose steppers, timestamps) — available as
// a theme token, not yet applied anywhere.
const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "وصفتي — Wasfati",
  description: "مساعد سلامة الأدوية بالذكاء الاصطناعي — AI-powered medication safety assistant",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "وصفتي",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B3D30",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={dirForLocale(locale)}
      className={`${plexArabic.variable} ${plexJakarta.variable} ${baloo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-app text-ink-900">
        <LanguageProvider initialLocale={locale}>
          <ServiceWorkerRegistration />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
