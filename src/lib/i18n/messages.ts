import type { Locale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/message-keys";
import en from "@/lib/i18n/locales/en.json";

export type { MessageKey } from "@/lib/i18n/message-keys";

export const MESSAGE_KEYS = Object.keys(en) as MessageKey[];

export type TranslateVars = Record<string, string | number | boolean | null | undefined>;

function applyVars(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined || value === null) continue;
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

/** English-only UI catalog. */
export function translate(
  _locale: Locale,
  key: MessageKey | string,
  vars?: TranslateVars
): string {
  const text = (en as Record<string, string>)[key] ?? key;
  return applyVars(text, vars);
}

export function createTranslator(_locale: Locale = "en") {
  return (key: MessageKey | string, vars?: TranslateVars) => translate("en", key, vars);
}

export function loadLocaleTableSync(_locale: Locale): Record<MessageKey, string> {
  return en as Record<MessageKey, string>;
}

export async function loadLocaleTableAsync(_locale: Locale): Promise<Record<MessageKey, string>> {
  return en as Record<MessageKey, string>;
}

export function prefetchLocaleTable(_locale: Locale): void {
  /* no-op — single static catalog */
}
