/**
 * Mobile i18n — English source in `en.json`, on-device ML Kit for the
 * user's chosen language (account / settings). Device language is fallback only.
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

const ALLOWED = new Set<string>(MOBILE_LOCALES);

export function normalizeMobileLocale(value?: string | null): Locale {
  const v = (value ?? "").trim();
  return (ALLOWED.has(v) ? v : "en") as Locale;
}

export async function setMobileLocale(locale: Locale) {
  await AsyncStorage.setItem(LOCALE_STORAGE, locale);
}

export async function getStoredMobileLocale(): Promise<Locale | null> {
  const stored = await AsyncStorage.getItem(LOCALE_STORAGE);
  if (!stored?.trim()) return null;
  return normalizeMobileLocale(stored);
}

export { LOCALE_STORAGE };
