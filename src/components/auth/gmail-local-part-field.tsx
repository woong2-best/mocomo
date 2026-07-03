"use client";

import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { parseGmailLocalPart } from "@/lib/signup-email-domains";

type GmailLocalPartFieldProps = {
  value: string;
  onChange: (localPart: string) => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Gmail 로컬 파트만 입력 — @gmail.com 은 고정 표시 */
export function GmailLocalPartField({
  value,
  onChange,
  id = "gmail-local",
  required = true,
  disabled = false,
  className,
}: GmailLocalPartFieldProps) {
  const { t } = useLocale();

  function handleChange(raw: string) {
    onChange(parseGmailLocalPart(raw.replace(/@/g, "")));
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Gmail
      </label>
      <div className="flex rounded-xl border border-input bg-background shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
        <Input
          id={id}
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="you"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted/30 border-l border-input shrink-0 select-none">
          @gmail.com
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">{t("auth.gmailLocalHint")}</p>
    </div>
  );
}
