"use client";

import {
  MOCO_PURCHASE_CHECKOUT_ACK,
  MOCO_PURCHASE_SUPPORT_EMAIL,
  MOCO_PURCHASE_TERMS_HREF,
  MOCO_PURCHASE_TERMS_LINK_LABEL,
} from "@/lib/legal/moco-purchase-consent";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  showSupportEmail?: boolean;
};

function CheckoutAckLabel() {
  const linkStart = MOCO_PURCHASE_CHECKOUT_ACK.indexOf(MOCO_PURCHASE_TERMS_LINK_LABEL);
  if (linkStart < 0) {
    return <span>{MOCO_PURCHASE_CHECKOUT_ACK}</span>;
  }
  const before = MOCO_PURCHASE_CHECKOUT_ACK.slice(0, linkStart);
  const after = MOCO_PURCHASE_CHECKOUT_ACK.slice(linkStart + MOCO_PURCHASE_TERMS_LINK_LABEL.length);
  return (
    <span>
      {before}
      <a
        href={MOCO_PURCHASE_TERMS_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-primary underline"
      >
        {MOCO_PURCHASE_TERMS_LINK_LABEL}
      </a>
      {after}
    </span>
  );
}

export function MocoPurchaseTermsCheckbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  showSupportEmail = false,
}: Props) {
  return (
    <div className={className}>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <CheckoutAckLabel />
      </label>
      {showSupportEmail ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Questions:{" "}
          <a href={`mailto:${MOCO_PURCHASE_SUPPORT_EMAIL}`} className="font-semibold text-primary underline">
            {MOCO_PURCHASE_SUPPORT_EMAIL}
          </a>
        </p>
      ) : null}
    </div>
  );
}
