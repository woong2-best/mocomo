"use client";

import { useEffect, useRef, useState } from "react";
import { DollarSign } from "lucide-react";
import { sanitizeUsdDollarInput } from "@/lib/money";
import { cn } from "@/lib/utils";

const iconBtnClass =
  "h-9 w-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40";

type ComposeSalePriceFieldProps = {
  priceUsd: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** toolbar: icon-only toggle · inline: always show pill */
  variant?: "toolbar" | "inline";
};

export function ComposeSalePriceField({
  priceUsd,
  onChange,
  disabled,
  variant = "toolbar",
}: ComposeSalePriceFieldProps) {
  const [open, setOpen] = useState(priceUsd.trim().length > 0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (priceUsd.trim()) setOpen(true);
  }, [priceUsd]);

  useEffect(() => {
    if (open && variant === "toolbar") {
      inputRef.current?.focus();
    }
  }, [open, variant]);

  function closeIfEmpty() {
    if (!priceUsd.trim()) setOpen(false);
  }

  const pill = (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-folk-cobalt/25 bg-folk-cream/70",
        "px-2.5 py-1 min-w-[6.75rem] shadow-[inset_0_1px_0_hsl(var(--folk-cream)/0.8)]",
        variant === "toolbar" ? "h-9" : "h-10 px-3"
      )}
      title="유료 판매 (USD, $1.00~)"
    >
      <span className="text-sm font-semibold text-folk-cobalt shrink-0 leading-none" aria-hidden>
        $
      </span>
      <input
        ref={inputRef}
        inputMode="decimal"
        placeholder="0"
        value={priceUsd}
        onChange={(e) => onChange(sanitizeUsdDollarInput(e.target.value))}
        onBlur={closeIfEmpty}
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-folk-cobalt",
          "outline-none placeholder:text-folk-cobalt/45"
        )}
        aria-label="유료 판매 가격 (USD)"
      />
      <span className="text-[11px] font-semibold text-folk-cobalt/65 shrink-0 tracking-wide">
        USD
      </span>
    </div>
  );

  if (variant === "inline") return pill;

  if (!open) {
    return (
      <button
        type="button"
        className={iconBtnClass}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="유료 판매 가격 (USD)"
        title="유료 판매 (USD, $1.00~)"
      >
        <DollarSign className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </button>
    );
  }

  return pill;
}
