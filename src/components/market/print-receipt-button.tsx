"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      className="rounded-lg border border-border px-3 py-1.5 text-sm print:hidden"
      onClick={() => window.print()}
    >
      {t("market.pdf")}
    </button>
  );
}
