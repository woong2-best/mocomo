"use client";

import {
  SUBCULTURE_LOT_TEMPLATES,
  type LotTemplate,
  type LotTemplateId,
} from "@/lib/subculture-commerce/lot-templates";
import type { UsedSubcultureFormState } from "@/components/used/used-subculture-fields";
import { cn } from "@/lib/utils";

export function UsedLotTemplatePicker({
  onApply,
  disabled,
}: {
  onApply: (patch: {
    subculture: Partial<UsedSubcultureFormState>;
    productType?: string;
    titleHint?: string;
    descriptionHint?: string;
  }) => void;
  disabled?: boolean;
}) {
  function applyTemplate(t: LotTemplate) {
    onApply({
      subculture: {
        listingFormat: t.listingFormat,
        meta: { ...t.meta },
      },
      productType: t.productType,
      titleHint: t.titleHint,
      descriptionHint: t.descriptionHint,
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Lot·세트 템플릿</p>
      <div className="flex flex-wrap gap-2">
        {SUBCULTURE_LOT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => applyTemplate(t)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border border-border",
              "hover:bg-primary/10 hover:border-primary/40 transition-colors",
              disabled && "opacity-50 pointer-events-none"
            )}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        템플릿을 누르면 등록 형식·상품 종류가 자동 설정됩니다.
      </p>
    </div>
  );
}

export type { LotTemplateId };
