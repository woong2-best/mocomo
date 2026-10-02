"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
          <FieldLabel>{t("used.stbpc5")}</FieldLabel>
          <Input
            value={meta.tcgSet ?? ""}
            onChange={(e) => set("tcgSet", e.target.value)}
            placeholder="SV4a"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.s1cq37xk")}</FieldLabel>
          <Input
            value={meta.tcgNumber ?? ""}
            onChange={(e) => set("tcgNumber", e.target.value)}
            placeholder="025/165"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.srx09k")}</FieldLabel>
          <Input
            value={meta.tcgRarity ?? ""}
            onChange={(e) => set("tcgRarity", e.target.value)}
            placeholder="SAR / UR"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("settings.language")}</FieldLabel>
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
          {t("used.slab_psa_bgs_cgc")}
        </label>
        {meta.graded && (
          <>
            <div className="space-y-1">
              <FieldLabel>{t("used.srcrck")}</FieldLabel>
              <Input
                value={meta.grader ?? ""}
                onChange={(e) => set("grader", e.target.value)}
                placeholder="PSA"
                className="h-10 rounded-xl"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("nav.tier")}</FieldLabel>
              <Input
                value={meta.grade ?? ""}
                onChange={(e) => set("grade", e.target.value)}
                placeholder="10"
                className="h-10 rounded-xl"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <FieldLabel>{t("used.so17kaz")}</FieldLabel>
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
          <FieldLabel>{t("used.si2k1ml")}</FieldLabel>
          <Input
            value={meta.album ?? ""}
            onChange={(e) => set("album", e.target.value)}
            placeholder={t("used.swwr2qk")}
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.swqlc")}</FieldLabel>
          <Input
            value={meta.member ?? ""}
            onChange={(e) => set("member", e.target.value)}
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <FieldLabel>{t("used.s1g1i5wi")}</FieldLabel>
          <Input
            value={meta.pcVersion ?? ""}
            onChange={(e) => set("pcVersion", e.target.value)}
            placeholder={t("used.s17j9exs")}
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
          <FieldLabel>{t("used.suabmg")}</FieldLabel>
          <Input
            value={meta.manufacturer ?? ""}
            onChange={(e) => set("manufacturer", e.target.value)}
            placeholder="Good Smile / Bandai"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.stin1c")}</FieldLabel>
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
          <FieldLabel>{t("used.s11dmr")}</FieldLabel>
          <Input
            value={meta.eventName ?? ""}
            onChange={(e) => set("eventName", e.target.value)}
            placeholder="C104 / AGF"
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.s19bji")}</FieldLabel>
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
        <FieldLabel>{t("used.st6zi8")}</FieldLabel>
        <Input
          value={meta.sizeLabel ?? ""}
          onChange={(e) => set("sizeLabel", e.target.value)}
          placeholder={t("used.m_165cm")}
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
        <h3 className="text-sm font-bold text-foreground">{t("used.stfvkbf")}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {t("used.s1k1wmko")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1">
          <FieldLabel>{t("used.s5h658k")}</FieldLabel>
          <Input
            value={value.characterName}
            onChange={(e) => patch({ characterName: e.target.value })}
            placeholder={t("used.s102uklj")}
            className="h-10 rounded-xl"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.s1m4ppl8")}</FieldLabel>
          <SelectField
            value={value.tradeMode}
            onChange={(v) => patch({ tradeMode: v })}
            options={SUBCULTURE_TRADE_MODES}
            disabled={disabled || saleType === "AUCTION"}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.sxxkr")}</FieldLabel>
          <SelectField
            value={value.conditionGrade}
            onChange={(v) => patch({ conditionGrade: v })}
            options={SUBCULTURE_CONDITION_GRADES}
            placeholder={t("used.s1xq2i0y")}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.s74febg")}</FieldLabel>
          <SelectField
            value={value.limitedKind}
            onChange={(v) => patch({ limitedKind: v })}
            options={SUBCULTURE_LIMITED_KINDS}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.s1vdv6lv")}</FieldLabel>
          <SelectField
            value={value.listingFormat}
            onChange={(v) => patch({ listingFormat: v })}
            options={SUBCULTURE_LISTING_FORMATS}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("used.s103gc")}</FieldLabel>
          <SelectField
            value={value.itemOrigin}
            onChange={(v) => patch({ itemOrigin: v })}
            options={SUBCULTURE_ITEM_ORIGINS}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <FieldLabel>{t("used.s1g27vn")}</FieldLabel>
          <SelectField
            value={value.packagingState}
            onChange={(v) => patch({ packagingState: v })}
            options={SUBCULTURE_PACKAGING_STATES}
            placeholder={t("used.sxzul")}
            disabled={disabled}
          />
        </div>
        {showLotCount && (
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <FieldLabel>{t("used.s4ypsxk")}</FieldLabel>
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
          <FieldLabel>{t("used.wtt")}</FieldLabel>
          <textarea
            value={value.meta.tradeWants ?? ""}
            onChange={(e) => patch({ meta: { ...value.meta, tradeWants: e.target.value } })}
            placeholder={t("used.s6foku2")}
            className="w-full min-h-[72px] rounded-xl border border-border p-3 text-sm"
            disabled={disabled}
          />
        </div>
      )}

      {saleType === "AUCTION" && value.tradeMode !== "SELL" && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400">
          {t("used.s1lzeyx9")}
        </p>
      )}
    </section>
  );
}

/** Re-export for product type select in parent */
export { SUBCULTURE_PRODUCT_TYPES };
