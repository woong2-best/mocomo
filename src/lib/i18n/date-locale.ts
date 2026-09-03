import { enUS, ja, ko, zhCN } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/config";

const DATE_LOCALES: Partial<Record<Locale, typeof enUS>> = {
  ko,
  en: enUS,
  ja,
  zh: zhCN,
  "zh-TW": zhCN,
};

export function dateFnsLocale(locale: Locale): typeof enUS {
  return DATE_LOCALES[locale] ?? enUS;
}
