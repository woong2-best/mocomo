"use client";

import {
  MOCO_FORTUNE_COOKIE_CONSENT_EN_BODY,
  MOCO_FORTUNE_COOKIE_CONSENT_KO_BODY,
  MOCO_FORTUNE_COOKIE_CONSENT_KO_TITLE,
  MOCO_FORTUNE_COOKIE_CONSENT_TITLE,
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
        <span className="space-y-1.5">
          <span className="block font-bold">{MOCO_FORTUNE_COOKIE_CONSENT_TITLE}</span>
          <span className="block font-bold">{MOCO_FORTUNE_COOKIE_CONSENT_KO_TITLE}</span>
          <span className="block text-muted-foreground">{MOCO_FORTUNE_COOKIE_CONSENT_KO_BODY}</span>
          <span className="block text-muted-foreground">{MOCO_FORTUNE_COOKIE_CONSENT_EN_BODY}</span>
          <span className="block text-muted-foreground">
            I also agree to the{" "}
            <a
              href={MOCO_PURCHASE_TERMS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary underline"
            >
              {MOCO_PURCHASE_TERMS_LINK_LABEL}
            </a>
            .
          </span>
        </span>
      </label>
    </div>
  );
}
