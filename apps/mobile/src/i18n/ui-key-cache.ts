import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { Locale } from "@/i18n";

const TABLE_PREFIX = "mocomo_ui_keys:";

export function uiMessagesAppVersion(): string {
  return Constants.expoConfig?.version ?? "0";
}

function tableKey(targetLocale: Locale, appVersion: string): string {
  return `${TABLE_PREFIX}${appVersion}:${targetLocale}`;
}

export async function loadUiKeyTable(
  targetLocale: Locale,
  appVersion = uiMessagesAppVersion()
): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(tableKey(targetLocale, appVersion));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const pendingPatches = new Map<string, Record<string, string>>();
let flushChain: Promise<void> = Promise.resolve();

async function flushUiKeyPatch(
  storageKey: string,
  targetLocale: Locale,
  appVersion: string
): Promise<void> {
  const patch = pendingPatches.get(storageKey);
  if (!patch) return;
  pendingPatches.delete(storageKey);
  try {
    const current = await loadUiKeyTable(targetLocale, appVersion);
    const newer = pendingPatches.get(storageKey);
    if (newer) {
      pendingPatches.delete(storageKey);
      Object.assign(patch, newer);
    }
    await AsyncStorage.setItem(storageKey, JSON.stringify({ ...current, ...patch }));
  } catch {
    /* ignore */
  }
}

export function mergeUiKeyTable(
  targetLocale: Locale,
  patch: Record<string, string>,
  appVersion = uiMessagesAppVersion()
): Promise<void> {
  if (!Object.keys(patch).length) return Promise.resolve();
  const storageKey = tableKey(targetLocale, appVersion);
  const bucket = pendingPatches.get(storageKey) ?? {};
  Object.assign(bucket, patch);
  pendingPatches.set(storageKey, bucket);
  const run = flushChain.then(() => flushUiKeyPatch(storageKey, targetLocale, appVersion));
  flushChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
