import type { Metadata, Viewport } from "next";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppProviders } from "@/components/providers/app-providers";
import { ShellRouter } from "@/components/layout/shell-router";
import { RightPanelHydrated } from "@/components/layout/right-panel-hydrated";
import { BRAND } from "@/lib/brand";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { DEFAULT_GUEST_COUNTRY, DEFAULT_GUEST_LOCALE } from "@/lib/i18n/config";
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
  metadataBase: new URL(getPublicSiteOrigin()),
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
  themeColor: "#111929",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.NEXT_PUBLIC_APT_BUILD_ID ??
  "local";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={DEFAULT_GUEST_LOCALE}
      className="dark"
      data-client="web"
      data-visible-animations="off"
      data-build={buildId}
      suppressHydrationWarning
    >
      <head>
        <meta name="mocomo-build-id" content={buildId} />
      </head>
      <body className={`${folkDisplay.variable} ${geistSans.variable} ${geistMono.variable} font-sans folk-canvas`}>
        <div className="folk-app-shell">
          <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
            <AppProviders>
              <ShellRouter
                rightPanel={
                  <RightPanelHydrated initialData={null} countryCode={DEFAULT_GUEST_COUNTRY} />
                }
              >
                {children}
              </ShellRouter>
            </AppProviders>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
