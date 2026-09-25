import { assertCountrySelectable } from "@/lib/compliance/ofac-sanctioned-countries";

/**
 * Settings / signup country picker — OFAC comprehensive embargo
 * plus additional blocked regions (not a payment-embargo list).
 */
export const SETTINGS_EXCLUDED_COUNTRY_CODES = [
  "KP",
  "IR",
  "CU",
  "SY",
  "RU",
  "BY",
  "VE",
  "AF",
  "MM",
  "SD",
  "NI",
] as const;

export const SETTINGS_EXCLUDED_COUNTRY_SET = new Set<string>(
  SETTINGS_EXCLUDED_COUNTRY_CODES
);

export function isSettingsExcludedCountry(code: string | null | undefined): boolean {
  return SETTINGS_EXCLUDED_COUNTRY_SET.has((code ?? "").trim().toUpperCase());
}

/** Block newly selected excluded countries; keep an already-saved value so locale-only saves work. */
export function assertSettingsCountrySelectable(
  next: string,
  current?: string | null
): { error: string } | null {
  const ofac = assertCountrySelectable(next);
  if (ofac) return ofac;
  const n = next.trim().toUpperCase();
  const cur = (current ?? "").trim().toUpperCase();
  if (isSettingsExcludedCountry(n) && n !== cur) {
    return { error: "This country is not available." };
  }
  return null;
}
