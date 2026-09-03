import type { Locale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/message-keys";
import en from "@/lib/i18n/locales/en.json";
import ko from "@/lib/i18n/locales/ko.json";

export type { MessageKey } from "@/lib/i18n/message-keys";

const memoryCache = new Map<string, Record<MessageKey, string>>();

function localesDir() {
  return `${process.cwd()}/src/lib/i18n/locales`;
}

/** Load locale table — server: fs; client: dynamic import + cache. */
export function loadLocaleTableSync(locale: Locale): Record<MessageKey, string> {
  if (memoryCache.has(locale)) return memoryCache.get(locale)!;

  if (typeof window === "undefined") {
    try {
      const fs = require("node:fs") as typeof import("node:fs");
      const file = `${localesDir()}/${locale}.json`;
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw) as Record<MessageKey, string>;
      memoryCache.set(locale, parsed);
      return parsed;
    } catch {
      const fallback = locale === "ko" ? ko : en;
      memoryCache.set(locale, fallback as Record<MessageKey, string>);
      return fallback as Record<MessageKey, string>;
    }
  }

  const fallback = (locale === "ko" ? ko : en) as Record<MessageKey, string>;
  memoryCache.set(locale, fallback);
  return fallback;
}

export async function loadLocaleTableAsync(locale: Locale): Promise<Record<MessageKey, string>> {
  if (memoryCache.has(locale)) return memoryCache.get(locale)!;
  try {
    const mod = await import(`@/lib/i18n/locales/${locale}.json`);
    const table = mod.default as Record<MessageKey, string>;
    memoryCache.set(locale, table);
    return table;
  } catch {
    return loadLocaleTableSync(locale);
  }
}

function applyVars(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string>
): string {
  const table = loadLocaleTableSync(locale);
  const text =
    table[key] ??
    (en as Record<MessageKey, string>)[key] ??
    (ko as Record<MessageKey, string>)[key] ??
    key;
  return applyVars(text, vars);
}

export function createTranslator(locale: Locale) {
  return (key: MessageKey, vars?: Record<string, string>) => translate(locale, key, vars);
}

/** Prefetch locale JSON on client after language change. */
export function prefetchLocaleTable(locale: Locale): void {
  if (typeof window === "undefined") return;
  void loadLocaleTableAsync(locale);
}
