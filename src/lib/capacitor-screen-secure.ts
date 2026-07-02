import { registerPlugin } from "@capacitor/core";

type ScreenSecurePlugin = {
  enable(): Promise<void>;
  disable(): Promise<void>;
};

const ScreenSecure = registerPlugin<ScreenSecurePlugin>("ScreenSecure");

export async function setScreenCaptureBlocked(blocked: boolean): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() !== "android") return;
    if (blocked) await ScreenSecure.enable();
    else await ScreenSecure.disable();
  } catch {
    /* 웹·iOS 또는 플러그인 미등록 */
  }
}
