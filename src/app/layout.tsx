import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppProviders } from "@/components/providers/app-providers";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { AppShell } from "@/components/layout/app-shell";
import { getRequestCountryCode, getRequestLocale } from "@/lib/i18n/server";
import { RightPanel, RightPanelSkeleton } from "@/components/layout/right-panel";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name} - ${BRAND.tagline}`,
  description: BRAND.description,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: BRAND.name },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, countryCode] = await Promise.all([getRequestLocale(), getRequestCountryCode()]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LocaleProvider initialLocale={locale} initialCountryCode={countryCode}>
            <AppProviders>
              <AppShell
              rightPanel={
                <Suspense fallback={<RightPanelSkeleton />}>
                  <RightPanel />
                </Suspense>
              }
            >
              {children}
              </AppShell>
            </AppProviders>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
