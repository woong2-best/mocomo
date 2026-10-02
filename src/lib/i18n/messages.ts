import type { Locale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/message-keys";
import en from "@/lib/i18n/locales/en.json";

export type { MessageKey } from "@/lib/i18n/message-keys";

export const MESSAGE_KEYS = Object.keys(en) as MessageKey[];

export type TranslateVars = Record<string, string | number | boolean | null | undefined>;

/** Positional `{v0}` slots come from migrated strings; drop any the caller didn't fill. */
const UNFILLED_POSITIONAL = /\{v\d+\}\s?/g;

function applyVars(text: string, vars?: TranslateVars): string {
  let out = text;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined || value === null) continue;
      out = out.replaceAll(`{${key}}`, String(value));
    }
  }
  return out.includes("{v") ? out.replace(UNFILLED_POSITIONAL, "") : out;
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
