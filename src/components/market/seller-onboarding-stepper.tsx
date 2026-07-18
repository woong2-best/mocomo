"use client";

import { cn } from "@/lib/utils";
import {
  SELLER_ONBOARDING_UI_LABELS,
  visibleSellerOnboardingUiSteps,
  type SellerOnboardingUiStep,
} from "@/lib/marketplace/seller-onboarding";

export function SellerOnboardingStepper({
  uiStep,
  countryCode,
}: {
  uiStep: SellerOnboardingUiStep;
  countryCode?: string | null;
}) {
  const visible = visibleSellerOnboardingUiSteps(countryCode);
  const currentIdx = Math.max(0, visible.indexOf(uiStep === "COMPLETE" ? "BANK" : uiStep));

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-[11px] sm:text-xs mb-6">
      {visible.map((id, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={id} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/50 mx-0.5">›</span>}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                active && "bg-primary/10 text-primary font-semibold",
                done && !active && "text-emerald-700",
                !done && !active && "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  active && "bg-primary text-primary-foreground",
                  done && !active && "bg-emerald-600 text-white",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {SELLER_ONBOARDING_UI_LABELS[id]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
