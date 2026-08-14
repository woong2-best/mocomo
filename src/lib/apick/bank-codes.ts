/** @deprecated — bank-catalog.ts 사용 */
export {
  buildApickBankCodeMap,
  apickBankDisplayName as apickBankLabel,
  isApickBankCode,
  normalizeBankAccountNum,
  getKrQuickPickBanks,
  searchKrBanks,
  KR_BANK_CATALOG,
} from "@/lib/apick/bank-catalog";

import { buildApickBankCodeMap, KR_BANK_CATALOG } from "@/lib/apick/bank-catalog";

export const APICK_BANK_CODES = buildApickBankCodeMap();

export const APICK_BANK_OPTIONS = KR_BANK_CATALOG.filter((b) => b.apickSupported).map((b) => ({
  code: b.code,
  name: b.name,
}));
