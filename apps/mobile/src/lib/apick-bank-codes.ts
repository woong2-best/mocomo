/** Mobile — KR bank catalog (sync with src/lib/apick/bank-catalog.ts) */

import { KR_BANKS, type KrBankEntry } from "@/data/server-values/kr-banks";

export type MobileBankEntry = KrBankEntry;

export { KR_BANKS };

export function getQuickPickBanks() {
  return KR_BANKS.filter((b) => b.quickPick);
}

export function searchKrBanks(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return KR_BANKS;
  return KR_BANKS.filter((b) => {
    const hay = [b.name, b.shortName, b.code, ...b.keywords].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function getBankByCode(code: string) {
  return KR_BANKS.find((b) => b.code === code);
}

/** @deprecated */
export const APICK_BANK_OPTIONS = KR_BANKS.map((b) => ({ code: b.code, name: b.name }));
