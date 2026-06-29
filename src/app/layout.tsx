import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppProviders } from "@/components/providers/app-providers";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ShellRouter } from "@/components/layout/shell-router";
import { getRequestI18n } from "@/lib/i18n/server";
import { resolveClientPlatform, CLIENT_PLATFORM_COOKIE } from "@/lib/client-platform";
import { isStudioHostname, resolveRequestHostname } from "@/studio/lib/host";
import { RightPanelAsync } from "@/components/layout/right-panel-async";
import { RightPanelSkeleton } from "@/components/layout/right-panel-content";
import { BRAND } from "@/lib/brand";
import { cookies, headers } from "next/headers";
import "./globals.css";

const folkDisplay = Fredoka({
  variable: "--font-folk-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});
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
  icons: {
    icon: [{ url: BRAND.logoSrc, type: "image/png" }],
    apple: [{ url: BRAND.logoSrc, type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: BRAND.name },
  openGraph: {
    title: BRAND.name,
    description: BRAND.description,
    images: [{ url: BRAND.logoSrc, alt: BRAND.name }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F0E8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, countryCode } = await getRequestI18n();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const initialPlatform = resolveClientPlatform({
    cookie: cookieStore.get(CLIENT_PLATFORM_COOKIE)?.value,
    host: headerStore.get("host") ?? undefined,
  });
  const isStudioHost = isStudioHostname(
    resolveRequestHostname(headerStore.get("x-forwarded-host") ?? headerStore.get("host"))
  );

  return (
    <html
      lang={locale}
      data-client={initialPlatform}
      data-visible-animations="off"
      suppressHydrationWarning
    >
      <body className={`${folkDisplay.variable} ${geistSans.variable} ${geistMono.variable} font-sans folk-canvas`}>
        <div className="folk-app-shell">
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <LocaleProvider initialLocale={locale} initialCountryCode={countryCode}>
              <AppProviders>
                <ShellRouter
                  initialPlatform={initialPlatform}
                  isStudioHost={isStudioHost}
                  rightPanel={
                    <Suspense fallback={<RightPanelSkeleton />}>
                      <RightPanelAsync />
                    </Suspense>
                  }
                >
                  {children}
                </ShellRouter>
              </AppProviders>
            </LocaleProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
