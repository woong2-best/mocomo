import { translate } from "@/i18n/runtime";

export function mocoPurchaseTermsCopy(): string {
  return translate("legal.mocoPurchaseTerms");
}

/** @deprecated Use mocoPurchaseTermsCopy() */
export function gemPurchaseTermsCopy(): string {
  return mocoPurchaseTermsCopy();
}
