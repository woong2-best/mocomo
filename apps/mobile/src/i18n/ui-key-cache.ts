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

export async function mergeUiKeyTable(
  targetLocale: Locale,
  patch: Record<string, string>,
  appVersion = uiMessagesAppVersion()
): Promise<void> {
  if (!Object.keys(patch).length) return;
  try {
    const current = await loadUiKeyTable(targetLocale, appVersion);
    await AsyncStorage.setItem(
      tableKey(targetLocale, appVersion),
      JSON.stringify({ ...current, ...patch })
    );
  } catch {
    /* ignore */
  }
}
