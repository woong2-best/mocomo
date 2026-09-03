"use client";

import {
  PURCHASE_CHARGEBACK_TERMS_BULLETS,
  PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL,
  PURCHASE_CHARGEBACK_TERMS_TITLE,
  PURCHASE_CHARGEBACK_TERMS_VERSION,
} from "@/lib/purchase-chargeback-terms";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function PurchaseChargebackTermsNotice({ checked, onCheckedChange, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 space-y-2",
        className
      )}
    >
      <p className="text-sm font-bold">
        {PURCHASE_CHARGEBACK_TERMS_TITLE}{" "}
        <span className="text-xs font-semibold text-muted-foreground">
          v{PURCHASE_CHARGEBACK_TERMS_VERSION}
        </span>
      </p>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
        {PURCHASE_CHARGEBACK_TERMS_BULLETS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <label className="flex items-start gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-xs font-semibold leading-snug">{PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL}</span>
      </label>
    </div>
  );
}
