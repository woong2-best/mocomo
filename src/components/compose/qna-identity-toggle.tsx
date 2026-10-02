"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { cn } from "@/lib/utils";

export function QnaIdentityToggle({
  anonymous,
  onChange,
  disabled,
  className,
}: {
  anonymous: boolean;
  onChange: (anonymous: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border p-0.5 text-xs font-semibold",
        className
      )}
      role="radiogroup"
      aria-label={t("compose.s1gpybll")}
    >
      <button
        type="button"
        role="radio"
        aria-checked={!anonymous}
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          !anonymous
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t("settings.postsLockOff")}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={anonymous}
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          anonymous
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t("lib.tests.community.author.test.sf130c4ef01")}
      </button>
    </div>
  );
}
