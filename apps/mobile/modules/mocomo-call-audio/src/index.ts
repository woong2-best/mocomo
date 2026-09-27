import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

type MocomoCallAudioNative = {
  start(endUrl: string, token: string): void;
  stop(): void;
};

function nativeModule(): MocomoCallAudioNative | null {
  if (Platform.OS !== "android") return null;
  return requireOptionalNativeModule<MocomoCallAudioNative>("MocomoCallAudio");
}

/** Android only. Keeps the mic alive off-screen and ends the call if the app is swiped away. */
export function startCallForeground(endUrl: string, token: string): void {
  try {
    nativeModule()?.start(endUrl, token);
  } catch {
    /* current binary has no call-audio module yet */
  }
}

export function stopCallForeground(): void {
  try {
    nativeModule()?.stop();
  } catch {
    /* ignore */
  }
}
