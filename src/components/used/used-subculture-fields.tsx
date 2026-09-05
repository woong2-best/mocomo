"use client";

import type { SubcultureProductFamily } from "@/lib/subculture-commerce/catalog";
import {
  isPhotocardProductType,
  isTcgProductType,
  subcultureProductFamily,
  SUBCULTURE_PRODUCT_TYPES,
} from "@/lib/subculture-commerce/catalog";
import {
  SUBCULTURE_CONDITION_GRADES,
  SUBCULTURE_ITEM_ORIGINS,
  SUBCULTURE_LIMITED_KINDS,
  SUBCULTURE_LISTING_FORMATS,
  SUBCULTURE_PACKAGING_STATES,
  SUBCULTURE_TRADE_MODES,
  type SubcultureVerticalMeta,
} from "@/lib/subculture-commerce/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type UsedSubcultureFormState = {
  characterName: string;
  conditionGrade: string;
  limitedKind: string;
  listingFormat: string;
  tradeMode: string;
  itemOrigin: string;
  packagingState: string;
  meta: SubcultureVerticalMeta;
};

export const EMPTY_SUBCULTURE_FORM: UsedSubcultureFormState = {
  characterName: "",
  conditionGrade: "",
  limitedKind: "STANDARD",
  listingFormat: "SINGLE",
  tradeMode: "SELL",
  itemOrigin: "OFFICIAL",
  packagingState: "",
  meta: {},
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>;
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { id: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function VerticalFields({
  family,
  meta,
  onMetaChange,
  disabled,
}: {
  family: SubcultureProductFamily;
  meta: SubcultureVerticalMeta;
  onMetaChange: (next: SubcultureVerticalMeta) => void;
  disabled?: boolean;
}) {
  function set<K extends keyof SubcultureVerticalMeta>(key: K, value: SubcultureVerticalMeta[K]) {
    onMetaChange({ ...meta, [key]: value });
  }

  if (family === "tcg") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <FieldLabel>세트명</FieldLabel>
          <Input
            value={meta.tcgSet ?? ""}
            onChange={(e) => set("tcgSet", e.target.value)}
            placeholder="SV4a"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>카드 번호</FieldLabel>
          <Input
            value={meta.tcgNumber ?? ""}
            onChange={(e) => set("tcgNumber", e.target.value)}
            placeholder="025/165"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>레어도</FieldLabel>
          <Input
            value={meta.tcgRarity ?? ""}
            onChange={(e) => set("tcgRarity", e.target.value)}
            placeholder="SAR / UR"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>언어</FieldLabel>
          <Input
            value={meta.tcgLanguage ?? ""}
            onChange={(e) => set("tcgLanguage", e.target.value)}
            placeholder="KR / JP / EN"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!meta.graded}
            onChange={(e) => set("graded", e.target.checked)}
            disabled={disabled}
          />
          등급사 slab (PSA/BGS/CGC)
        </label>
        {meta.graded && (
          <>
            <div className="space-y-1">
              <FieldLabel>등급사</FieldLabel>
              <Input
                value={meta.grader ?? ""}
                onChange={(e) => set("grader", e.target.value)}
                placeholder="PSA"
                className="h-10 rounded-xl"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>등급</FieldLabel>
              <Input
                value={meta.grade ?? ""}
                onChange={(e) => set("grade", e.target.value)}
                placeholder="10"
                className="h-10 rounded-xl"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <FieldLabel>인증 번호</FieldLabel>
              <Input
                value={meta.certNumber ?? ""}
                onChange={(e) => set("certNumber", e.target.value)}
                className="h-10 rounded-xl"
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  if (family === "photocard") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <FieldLabel>앨범·활동명</FieldLabel>
          <Input
            value={meta.album ?? ""}
            onChange={(e) => set("album", e.target.value)}
            placeholder="앨범 / MD"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>멤버</FieldLabel>
          <Input
            value={meta.member ?? ""}
            onChange={(e) => set("member", e.target.value)}
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <FieldLabel>버전·특전</FieldLabel>
          <Input
            value={meta.pcVersion ?? ""}
            onChange={(e) => set("pcVersion", e.target.value)}
            placeholder="럭드 / 위버스 / 미공포"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  if (family === "figure") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <FieldLabel>제조사</FieldLabel>
          <Input
            value={meta.manufacturer ?? ""}
            onChange={(e) => set("manufacturer", e.target.value)}
            placeholder="Good Smile / Bandai"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>스케일</FieldLabel>
          <Input
            value={meta.scale ?? ""}
            onChange={(e) => set("scale", e.target.value)}
            placeholder="1/7"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  if (family === "doujin") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <FieldLabel>행사</FieldLabel>
          <Input
            value={meta.eventName ?? ""}
            onChange={(e) => set("eventName", e.target.value)}
            placeholder="C104 / AGF"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>서클·작가</FieldLabel>
          <Input
            value={meta.circleName ?? ""}
            onChange={(e) => set("circleName", e.target.value)}
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  if (family === "cosplay") {
    return (
      <div className="space-y-1">
        <FieldLabel>사이즈</FieldLabel>
        <Input
          value={meta.sizeLabel ?? ""}
          onChange={(e) => set("sizeLabel", e.target.value)}
          placeholder="M / 165cm 기준"
          className="h-10 rounded-xl"
          disabled={disabled}
        />
      </div>
    );
  }

  return null;
}

export function UsedSubcultureFields({
  productType,
  value,
  onChange,
  disabled,
  saleType,
}: {
  productType: string;
  value: UsedSubcultureFormState;
  onChange: (next: UsedSubcultureFormState) => void;
  disabled?: boolean;
  saleType?: "FIXED" | "AUCTION";
}) {
  const family = subcultureProductFamily(productType);
  const showLotCount =
    value.listingFormat === "LOT" ||
    value.listingFormat === "BINDER" ||
    value.listingFormat === "BOX" ||
    value.listingFormat === "SET";

  function patch(partial: Partial<UsedSubcultureFormState>) {
    onChange({ ...value, ...partial });
  }

  const isTrade = value.tradeMode === "TRADE" || value.tradeMode === "SELL_OR_TRADE";

  return (
    <section
      className={cn(
        "rounded-xl border border-folk-cobalt/15 bg-folk-cream/40 dark:bg-muted/20 p-3 space-y-3"
      )}
    >
      <div>
        <h3 className="text-sm font-bold text-foreground">서브컬처 상세</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          카드·포카·한정굿 등 — 검색·신뢰에 쓰이는 정보
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1">
          <FieldLabel>캐릭터·멤버</FieldLabel>
          <Input
            value={value.characterName}
            onChange={(e) => patch({ characterName: e.target.value })}
            placeholder="캐릭터 / 멤버명"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>거래 방식</FieldLabel>
          <SelectField
            value={value.tradeMode}
            onChange={(v) => patch({ tradeMode: v })}
            options={SUBCULTURE_TRADE_MODES}
            disabled={disabled || saleType === "AUCTION"}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>상태</FieldLabel>
          <SelectField
            value={value.conditionGrade}
            onChange={(v) => patch({ conditionGrade: v })}
            options={SUBCULTURE_CONDITION_GRADES}
            placeholder="상태 선택"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>한정 유형</FieldLabel>
          <SelectField
            value={value.limitedKind}
            onChange={(v) => patch({ limitedKind: v })}
            options={SUBCULTURE_LIMITED_KINDS}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>판매 형태</FieldLabel>
          <SelectField
            value={value.listingFormat}
            onChange={(v) => patch({ listingFormat: v })}
            options={SUBCULTURE_LISTING_FORMATS}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>출처</FieldLabel>
          <SelectField
            value={value.itemOrigin}
            onChange={(v) => patch({ itemOrigin: v })}
            options={SUBCULTURE_ITEM_ORIGINS}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <FieldLabel>포장·구성</FieldLabel>
          <SelectField
            value={value.packagingState}
            onChange={(v) => patch({ packagingState: v })}
            options={SUBCULTURE_PACKAGING_STATES}
            placeholder="선택"
            disabled={disabled}
          />
        </div>
        {showLotCount && (
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <FieldLabel>수량 (장·개)</FieldLabel>
            <Input
              type="number"
              min={1}
              value={value.meta.itemCount ?? ""}
              onChange={(e) =>
                patch({
                  meta: {
                    ...value.meta,
                    itemCount: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              className="h-10 rounded-xl"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {(isTcgProductType(productType) ||
        isPhotocardProductType(productType) ||
        family === "figure" ||
        family === "doujin" ||
        family === "cosplay") && (
        <VerticalFields
          family={family}
          meta={value.meta}
          onMetaChange={(meta) => patch({ meta })}
          disabled={disabled}
        />
      )}

      {isTrade && saleType !== "AUCTION" && (
        <div className="space-y-1">
          <FieldLabel>교환 희망 (WTT)</FieldLabel>
          <textarea
            value={value.meta.tradeWants ?? ""}
            onChange={(e) => patch({ meta: { ...value.meta, tradeWants: e.target.value } })}
            placeholder="원하는 카드·멤버·작품을 적어 주세요"
            className="w-full min-h-[72px] rounded-xl border border-border p-3 text-sm"
            disabled={disabled}
          />
        </div>
      )}

      {saleType === "AUCTION" && value.tradeMode !== "SELL" && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400">
          경매는 판매 전용입니다. 교환은 일반 판매로 등록해 주세요.
        </p>
      )}
    </section>
  );
}

/** Re-export for product type select in parent */
export { SUBCULTURE_PRODUCT_TYPES };
