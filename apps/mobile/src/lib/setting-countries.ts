/** ISO codes for settings/signup — excludes KP IR CU SY RU BY VE AF MM SD NI. */
export const SETTING_COUNTRY_CODES = [
  "AL", "AD", "AE", "AG", "AM", "AO", "AR", "AT", "AU", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN",
  "BO", "BR", "BS", "BT", "BW", "BZ", "CA", "CD", "CF", "CG",
  "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CV", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER",
  "ES", "ET", "FI", "FJ", "FM", "FR", "GA", "GB", "GD", "GE",
  "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY", "HN", "HR",
  "HT", "HU", "ID", "IE", "IL", "IN", "IQ", "IS", "IT", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KR", "KW",
  "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU",
  "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML",
  "MN", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NE", "NG", "NL", "NO", "NP", "NR", "NZ", "OM", "OTHER", "PA",
  "PE", "PG", "PH", "PK", "PL", "PS", "PT", "PW", "PY", "QA",
  "RO", "RS", "RW", "SA", "SB", "SC", "SE", "SG", "SI", "SK",
  "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SZ", "TD",
  "TG", "TH", "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV",
  "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VN",
  "VU", "WS", "XK", "YE", "ZA", "ZM", "ZW",
] as const;

export type SettingCountryCode = (typeof SETTING_COUNTRY_CODES)[number];

const regionNames = new Map<string, Intl.DisplayNames>();

function regionDisplay(code: string, locale: string): string {
  if (code === "OTHER") {
    if (locale.startsWith("ko")) return "기타";
    if (locale.startsWith("ja")) return "その他";
    if (locale.startsWith("zh")) return "其他";
    return "Other";
  }
  const tag = locale.startsWith("zh-TW") || locale.startsWith("zh-Hant")
    ? "zh-Hant"
    : locale.startsWith("zh")
      ? "zh-Hans"
      : locale.split("-")[0] ?? locale;
  let display = regionNames.get(tag);
  if (!display) {
    try {
      display = new Intl.DisplayNames([tag, "en"], { type: "region" });
      regionNames.set(tag, display);
    } catch {
      return code;
    }
  }
  return display.of(code) ?? code;
}

export function settingCountryLabel(code: string, locale = "en"): string {
  return regionDisplay(code, locale);
}

export function filterSettingCountries(query: string, locale = "en") {
  const q = query.trim().toLowerCase();
  return SETTING_COUNTRY_CODES.filter((code) => {
    if (!q) return true;
    const label = settingCountryLabel(code, locale).toLowerCase();
    const en = settingCountryLabel(code, "en").toLowerCase();
    const ko = settingCountryLabel(code, "ko").toLowerCase();
    return (
      code.toLowerCase().includes(q) ||
      label.includes(q) ||
      en.includes(q) ||
      ko.includes(q)
    );
  });
}
