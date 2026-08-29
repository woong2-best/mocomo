"use client";

import type { ContentRating } from "@prisma/client";
import { cn } from "@/lib/utils";
import { contentRatingLabel } from "@/lib/content-rating";
import { AdultMonetizationNotice } from "@/components/legal/adult-monetization-notice";

type Props = {
  value: ContentRating;
  onChange: (value: ContentRating) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
};

/** 크리에이터 등록 시 필수 콘텐츠 유형 선택 (일반 / 성인) */
export function ContentRatingSelect({
  value,
  onChange,
  disabled,
  className,
  required = true,
}: Props) {
  return (
    <fieldset className={cn("space-y-2", className)} disabled={disabled}>
      <legend className="text-sm font-medium">
        콘텐츠 유형{required ? <span className="text-destructive"> *</span> : null}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["GENERAL", "ADULT"] as ContentRating[]).map((rating) => (
          <label
            key={rating}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              value === rating
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/40"
            )}
          >
            <input
              type="radio"
              name="contentRating"
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              required={required}
              className="mt-1"
            />
            <span className="text-left">
              <span className="block text-sm font-semibold">{contentRatingLabel(rating)}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {rating === "GENERAL"
                  ? "유료 판매·후원·구독 가능 (약관 준수)"
                  : "게시만 가능 · 유료 거래 전면 금지"}
              </span>
            </span>
          </label>
        ))}
      </div>
      {value === "ADULT" ? <AdultMonetizationNotice compact /> : null}
    </fieldset>
  );
}

export function parseContentRatingFromForm(form: FormData): ContentRating | null {
  const raw = form.get("contentRating");
  if (raw === "GENERAL" || raw === "ADULT") return raw;
  if (form.get("isNsfw") === "on") return "ADULT";
  return "GENERAL";
}
