"use client";

import { CONTENT_VISIBILITY_OPTIONS } from "@/lib/creator-subscription";
import type { ContentVisibility } from "@prisma/client";
import { cn } from "@/lib/utils";

export function ContentVisibilitySelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: ContentVisibility;
  onChange: (value: ContentVisibility) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor="content-visibility" className="text-xs font-medium text-muted-foreground">
        공개 범위
      </label>
      <select
        id="content-visibility"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as ContentVisibility)}
        className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
      >
        {CONTENT_VISIBILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} — {opt.hint}
          </option>
        ))}
      </select>
    </div>
  );
}
