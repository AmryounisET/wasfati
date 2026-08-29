import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
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
  themeColor: "#00485a",
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
      className={`${plexArabic.variable} ${inter.variable} h-full antialiased`}
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
