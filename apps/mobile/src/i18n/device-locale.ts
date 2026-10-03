import { getLocales } from "expo-localization";
import { normalizeMobileLocale, type Locale } from "@/i18n";

/** Device UI language — not the signed-in user's profile locale. */
export function readDeviceLocale(): Locale {
  const tag = getLocales()[0]?.languageTag ?? getLocales()[0]?.languageCode ?? "en";
  const base = tag.split("-")[0] ?? "en";
  if (tag.startsWith("zh-Hant") || tag === "zh-TW") return "zh-TW";
  if (base === "zh") return "zh";
  if (base === "pt" && /BR/i.test(tag)) return "pt-BR";
  return normalizeMobileLocale(base);
}
