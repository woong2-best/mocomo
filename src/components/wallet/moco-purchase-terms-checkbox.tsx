"use client";

import {
  MOCO_PURCHASE_TERMS_HREF,
  MOCO_PURCHASE_TERMS_LINK_LABEL,
} from "@/lib/legal/moco-purchase-consent";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function MocoPurchaseTermsCheckbox({
  checked,
  onCheckedChange,
  disabled,
  className,
}: Props) {
  return (
    <div className={className}>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-foreground">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 shrink-0"
          required
        />
        <span>
          [Required] By purchasing MOCO, I agree to the{" "}
          <a
            href={MOCO_PURCHASE_TERMS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary underline"
          >
            {MOCO_PURCHASE_TERMS_LINK_LABEL}
          </a>
          , including immediate delivery of the Package and that all sales are final except as stated.
        </span>
      </label>
    </div>
  );
}
