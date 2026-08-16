/**
 * @deprecated LEGACY — Capacitor WebView is not the MoCoMo product path.
 * Product app: apps/mobile (React Native / Expo). See docs/CAPACITOR_LEGACY.md
 * and docs/MOBILE_APP_ARCHITECTURE.md.
 */
import type { CapacitorConfig } from "@capacitor/cli";

const appServerUrl =
  process.env.CAPACITOR_SERVER_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://mocomo.net";

const config: CapacitorConfig = {
  appId: "net.mocomo.app",
  appName: "MoCoMo",
  // LEGACY Remote WebView shell — do not bundle full `public/` (~700MB) into the AAB.
  webDir: "android-web",
  server: {
    url: appServerUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#F5F0E8",
      showSpinner: false,
    },
  },
};

export default config;
