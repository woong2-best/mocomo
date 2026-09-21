import { Platform, NativeEventEmitter, type EmitterSubscription } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

type PipModeEvent = { active: boolean };

type MocomoLivePipNative = {
  isSupported(): boolean;
  isActive(): boolean;
  setEnabled(enabled: boolean, width?: number, height?: number): Promise<void>;
  enter(width?: number, height?: number): Promise<boolean>;
};

function getNative(): MocomoLivePipNative | null {
  if (Platform.OS !== "android") return null;
  return requireOptionalNativeModule<MocomoLivePipNative>("MocomoLivePip");
}

export function isLivePipSupported(): boolean {
  if (Platform.OS === "ios") return true;
  const mod = getNative();
  try {
    return !!mod?.isSupported();
  } catch {
    return false;
  }
}

export function isLivePipActive(): boolean {
  if (Platform.OS !== "android") return false;
  try {
    return !!getNative()?.isActive();
  } catch {
    return false;
  }
}

export async function setLivePipEnabled(
  enabled: boolean,
  aspect: { width?: number; height?: number } = {}
): Promise<void> {
  if (Platform.OS !== "android") return;
  const mod = getNative();
  if (!mod) return;
  await mod.setEnabled(enabled, aspect.width ?? 16, aspect.height ?? 9);
}

export async function enterLivePip(
  aspect: { width?: number; height?: number } = {}
): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const mod = getNative();
  if (!mod) return false;
  return mod.enter(aspect.width ?? 16, aspect.height ?? 9);
}

export function subscribeLivePipMode(listener: (active: boolean) => void): () => void {
  if (Platform.OS !== "android") return () => undefined;
  const mod = getNative();
  if (!mod) return () => undefined;

  // Expo modules with Events() expose addListener on the native module object.
  const anyMod = mod as MocomoLivePipNative & {
    addListener?: (event: string, cb: (e: PipModeEvent) => void) => EmitterSubscription;
    removeListeners?: (count: number) => void;
  };

  if (typeof anyMod.addListener === "function") {
    const sub = anyMod.addListener("onPipModeChanged", (e) => listener(!!e?.active));
    return () => sub.remove();
  }

  try {
    const emitter = new NativeEventEmitter(anyMod as never);
    const sub = emitter.addListener("onPipModeChanged", (e: PipModeEvent) => {
      listener(!!e?.active);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
