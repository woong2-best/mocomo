"use client";

import { cn } from "@/lib/utils";
import {
  RECURRING_DONATION_CHECKBOX_LABEL_KO,
  RECURRING_DONATION_CHECKOUT_NOTICE_KO,
} from "@/lib/recurring-donation-terms";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

/** ROSCA / FTC — recurring donation disclosure + opt-in checkbox (default unchecked) */
export function RecurringDonationTermsNotice({ checked, onCheckedChange, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-violet-500/35 bg-violet-500/5 px-4 py-3 space-y-2",
        className
      )}
    >
      <p className="text-sm font-bold text-violet-900 dark:text-violet-100">정기 후원 안내</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {RECURRING_DONATION_CHECKOUT_NOTICE_KO}
      </p>
      <label className="flex items-start gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-xs font-semibold leading-relaxed">{RECURRING_DONATION_CHECKBOX_LABEL_KO}</span>
      </label>
    </div>
  );
}
