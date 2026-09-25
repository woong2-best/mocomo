/**
 * Mobile i18n — loads static UI messages from web API (same catalog as site).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Locale =
  | "ko"
  | "en"
  | "ja"
  | "zh"
  | "zh-TW"
  | "el"
  | "fr"
  | "de"
  | "es"
  | "pt"
  | "pt-BR"
  | "it"
  | "nl"
  | "pl"
  | "ru"
  | "uk"
  | "ar"
  | "he"
  | "tr"
  | "fa"
  | "hi"
  | "bn"
  | "ta"
  | "te"
  | "mr"
  | "ur"
  | "th"
  | "vi"
  | "id"
  | "ms"
  | "fil"
  | "sw"
  | "sv"
  | "no"
  | "da"
  | "fi"
  | "cs"
  | "sk"
  | "hu"
  | "ro"
  | "bg"
  | "hr"
  | "sr"
  | "sl"
  | "lt"
  | "lv"
  | "et"
  | "sq"
  | "mk"
  | "ca"
  | "eu"
  | "gl"
  | "is"
  | "ga"
  | "cy"
  | "af"
  | "am"
  | "az"
  | "be"
  | "bs"
  | "ka"
  | "kk"
  | "km"
  | "lo"
  | "mn"
  | "my"
  | "ne"
  | "si"
  | "uz"
  | "hy"
  | "mt"
  | "lb"
  | "pa"
  | "ha"
  | "yo"
  | "ig"
  | "zu"
  | "eo";

export const MOBILE_LOCALES: readonly Locale[] = [
  "ko", "en", "ja", "zh", "zh-TW", "el", "fr", "de", "es", "pt", "pt-BR", "it",
  "nl", "pl", "ru", "uk", "ar", "he", "tr", "fa", "hi", "bn", "ta", "te", "mr",
  "ur", "th", "vi", "id", "ms", "fil", "sw", "sv", "no", "da", "fi", "cs", "sk",
  "hu", "ro", "bg", "hr", "sr", "sl", "lt", "lv", "et", "sq", "mk", "ca", "eu",
  "gl", "is", "ga", "cy", "af", "am", "az", "be", "bs", "ka", "kk", "km", "lo",
  "mn", "my", "ne", "si", "uz", "hy", "mt", "lb", "pa", "ha", "yo", "ig", "zu",
  "eo",
];

const languageNames = new Map<string, Intl.DisplayNames>();

export function mobileLocaleLabel(code: Locale, uiLocale: string = "en"): string {
  const tag = uiLocale.startsWith("zh-TW") ? "zh-Hant" : uiLocale.split("-")[0] ?? uiLocale;
  let display = languageNames.get(tag);
  if (!display) {
    try {
      display = new Intl.DisplayNames([tag, "en"], { type: "language" });
      languageNames.set(tag, display);
    } catch {
      return code;
    }
  }
  return display.of(code) ?? code;
}

export function filterMobileLocales(query: string, uiLocale = "en"): Locale[] {
  const q = query.trim().toLowerCase();
  return MOBILE_LOCALES.filter((code) => {
    if (!q) return true;
    const label = mobileLocaleLabel(code, uiLocale).toLowerCase();
    const native = mobileLocaleLabel(code, code).toLowerCase();
    return code.toLowerCase().includes(q) || label.includes(q) || native.includes(q);
  });
}

const LOCALE_STORAGE = "mocomo_mobile_locale";
const MESSAGES_CACHE_PREFIX = "mocomo_mobile_messages:";

type MessageTable = Record<string, string>;

let memoryLocale: Locale = "en";
let memoryTable: MessageTable | null = null;

const ALLOWED = new Set<string>([
  "ko", "en", "ja", "zh", "zh-TW", "el", "fr", "de", "es", "pt", "pt-BR", "it", "nl", "pl", "ru", "uk",
  "ar", "he", "tr", "fa", "hi", "bn", "ta", "te", "mr", "ur", "th", "vi", "id", "ms", "fil", "sw", "sv",
  "no", "da", "fi", "cs", "sk", "hu", "ro", "bg", "hr", "sr", "sl", "lt", "lv", "et", "sq", "mk", "ca",
  "eu", "gl", "is", "ga", "cy", "af", "am", "az", "be", "bs", "ka", "kk", "km", "lo", "mn", "my", "ne",
  "si", "uz", "hy", "mt", "lb", "pa", "ha", "yo", "ig", "zu", "eo",
]);

export function normalizeMobileLocale(value?: string | null): Locale {
  const v = (value ?? "").trim();
  return (ALLOWED.has(v) ? v : "en") as Locale;
}

function applyVars(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  let out = text;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

export async function loadMobileMessages(
  locale: Locale,
  apiBase: string
): Promise<MessageTable> {
  const cacheKey = `${MESSAGES_CACHE_PREFIX}${locale}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as MessageTable;
    } catch {
      /* refresh */
    }
  }

  const res = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/i18n/messages?locale=${encodeURIComponent(locale)}`
  );
  if (!res.ok) throw new Error("Failed to load messages");
  const json = (await res.json()) as { messages: MessageTable };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(json.messages));
  return json.messages;
}

export async function setMobileLocale(locale: Locale) {
  memoryLocale = locale;
  await AsyncStorage.setItem(LOCALE_STORAGE, locale);
}

export async function getStoredMobileLocale(): Promise<Locale> {
  const stored = await AsyncStorage.getItem(LOCALE_STORAGE);
  return normalizeMobileLocale(stored);
}

export function createMobileTranslator(table: MessageTable, _locale: Locale) {
  return (key: string, vars?: Record<string, string>) => {
    const text = table[key] ?? key;
    return applyVars(text, vars);
  };
}

export async function initMobileI18n(apiBase: string, locale?: Locale) {
  const loc = locale ?? (await getStoredMobileLocale());
  memoryLocale = loc;
  memoryTable = await loadMobileMessages(loc, apiBase);
  return createMobileTranslator(memoryTable, loc);
}

export { LOCALE_STORAGE };
