"use client";

import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const STEP_KEYS: MessageKey[] = ["auth.signupStep1", "auth.signupStep2", "auth.signupStep3"];

export function SignupStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      {STEP_KEYS.map((key, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <span key={key} className="flex items-center gap-1">
            {i > 0 && <span className="text-border">›</span>}
            <span
              className={
                active
                  ? "font-semibold text-foreground"
                  : done
                    ? "text-emerald-600"
                    : ""
              }
            >
              {n}. {t(key)}
            </span>
          </span>
        );
      })}
    </div>
  );
}
