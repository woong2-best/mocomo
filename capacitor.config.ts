import type { CapacitorConfig } from "@capacitor/cli";

const appServerUrl =
  process.env.CAPACITOR_SERVER_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://mocomo.net?client=app";

const config: CapacitorConfig = {
  appId: "net.mocomo.app",
  appName: "MoCoMo",
  webDir: "public",
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
