"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MarketplaceListingType, MarketplaceShippingFeeType } from "@prisma/client";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_BROWSE_LISTING_TYPES,
} from "@/lib/marketplace/constants";
import {
  listAllMarketplaceCarriers,
  MARKETPLACE_SHIP_COUNTRIES,
  type MarketplaceShipCountryCode,
} from "@/lib/marketplace/shipping-config";
import { createMarketplaceListing } from "@/actions/marketplace";
import { SETTLEMENT_ACCOUNT_REQUIRED_CODE } from "@/lib/settlement-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentRatingSelect } from "@/components/forms/content-rating-select";
import type { ContentRating } from "@prisma/client";

const PREFERRED_CARRIER_CHOICES = listAllMarketplaceCarriers();

export function MarketplaceListingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [type, setType] = useState<MarketplaceListingType>("PHYSICAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(MARKETPLACE_CATEGORIES[0]);
  const [tags, setTags] = useState("");
  const [priceAmount, setPriceAmount] = useState("1000");
  const [stock, setStock] = useState("1");
  const [coverUrl, setCoverUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState("");
  const [productionDays, setProductionDays] = useState("14");
  const [shipToCountries, setShipToCountries] = useState<MarketplaceShipCountryCode[]>([
    "KR",
  ]);
  const [shippingMethods, setShippingMethods] = useState<string[]>(["KR_POST", "INTL_EMS"]);
  const [shippingFeeType, setShippingFeeType] = useState<MarketplaceShippingFeeType>("FIXED");
  const [shippingFeeFixed, setShippingFeeFixed] = useState("300");
  const [optionName, setOptionName] = useState("");
  const [optionValues, setOptionValues] = useState("");
  const [options, setOptions] = useState<{ name: string; values: string[] }[]>([]);
  const [contentRating, setContentRating] = useState<ContentRating>("GENERAL");

  const typeMeta = useMemo(
    () => MARKETPLACE_BROWSE_LISTING_TYPES.find((t) => t.id === type),
    [type]
  );

  function addOption() {
    const name = optionName.trim();
    const values = optionValues
      .split(/[,/\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (!name || values.length === 0) return;
    setOptions((prev) => [...prev, { name, values }].slice(0, 8));
    setOptionName("");
    setOptionValues("");
  }

  function toggleShipTo(code: MarketplaceShipCountryCode) {
    setShipToCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function toggleCarrier(id: string) {
    setShippingMethods((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 12)
    );
  }

  function submit(publish: boolean) {
    setError("");
    if (shipToCountries.length === 0) {
      setError("배송 가능 국가를 1개 이상 선택해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await createMarketplaceListing({
        title,
        description,
        type,
        category,
        tags: tags.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean),
        priceAmount: Number(priceAmount),
        stock: Number(stock),
        coverUrl: coverUrl.trim() || undefined,
        mediaUrls: mediaUrls
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
        productionDays:
          type === "CUSTOM_ORDER" || type === "PREORDER" ? Number(productionDays) : undefined,
        shippingMethods,
        shippingFeeType,
        shippingFeeFixed: Number(shippingFeeFixed) || 0,
        shipToCountries,
        options: options.length ? options : undefined,
        publish,
        contentRating,
        isNsfw: contentRating === "ADULT",
      });
      if ("error" in res && res.error) {
        if ("code" in res && res.code === SETTLEMENT_ACCOUNT_REQUIRED_CODE && "redirectTo" in res) {
          router.push(String(res.redirectTo));
          return;
        }
        setError(res.error);
        return;
      }
      if ("listingId" in res) {
        router.push(`/market/i/${res.listingId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">판매 종류</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {MARKETPLACE_BROWSE_LISTING_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                type === t.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <p className="font-semibold text-sm">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>
        {typeMeta && (
          <p className="text-xs text-muted-foreground">{typeMeta.description}</p>
        )}
      </section>

      <section className="space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" maxLength={120} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명"
          rows={6}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="태그 (쉼표 구분)" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="number"
            min={0}
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            placeholder="가격 (USD cents, 예: 1000 = $10)"
          />
          <Input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="재고"
          />
        </div>
      </section>

      {(type === "CUSTOM_ORDER" || type === "PREORDER") && (
        <section className="space-y-2">
          <label className="text-sm font-semibold">제작기간 (일)</label>
          <Input
            type="number"
            min={1}
            value={productionDays}
            onChange={(e) => setProductionDays(e.target.value)}
          />
        </section>
      )}

      <section className="space-y-2">
        <label className="text-sm font-semibold">커버·미디어 URL</label>
        <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="커버 이미지 URL" />
        <textarea
          value={mediaUrls}
          onChange={(e) => setMediaUrls(e.target.value)}
          placeholder={"추가 사진/영상 URL (줄바꿈)"}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">옵션</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={optionName}
            onChange={(e) => setOptionName(e.target.value)}
            placeholder="옵션명 (예: 색상)"
            className="max-w-[140px]"
          />
          <Input
            value={optionValues}
            onChange={(e) => setOptionValues(e.target.value)}
            placeholder="값 (예: 빨강, 파랑)"
            className="min-w-[180px] flex-1"
          />
          <Button type="button" variant="secondary" onClick={addOption}>
            추가
          </Button>
        </div>
        {options.length > 0 && (
          <ul className="text-sm space-y-1">
            {options.map((o) => (
              <li key={o.name} className="text-muted-foreground">
                <span className="font-medium text-foreground">{o.name}</span>: {o.values.join(", ")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">배송 가능 국가</h2>
            <p className="text-xs text-muted-foreground">
              현재 KR / US / JP / CN 만 지원합니다. 복수 선택 가능합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {MARKETPLACE_SHIP_COUNTRIES.map((c) => {
                const checked = shipToCountries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggleShipTo(c.code)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                      checked
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {checked ? "☑ " : "☐ "}
                    {c.labelKo}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">주로 이용하는 배송사</h2>
            <p className="text-xs text-muted-foreground">
              발송 시 선택합니다. 국제 배송(EMS/DHL 등) 포함. MoCoMo는 배송을 대행하지 않습니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {PREFERRED_CARRIER_CHOICES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleCarrier(m.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                    shippingMethods.includes(m.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={shippingFeeType}
              onChange={(e) => setShippingFeeType(e.target.value as MarketplaceShippingFeeType)}
            >
              <option value="FREE">무료배송</option>
              <option value="FIXED">고정 배송비</option>
              <option value="BY_COUNTRY">국가별 (추후)</option>
              <option value="FREE_OVER_AMOUNT">금액별 무료 (추후)</option>
            </select>
            <Input
              type="number"
              min={0}
              value={shippingFeeFixed}
              onChange={(e) => setShippingFeeFixed(e.target.value)}
              placeholder="배송비 (USD cents, 예: 300 = $3)"
              disabled={shippingFeeType === "FREE"}
            />
          </div>
        </section>

      <ContentRatingSelect value={contentRating} onChange={setContentRating} disabled={pending} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => submit(true)}>
          {pending ? "등록 중…" : "판매 등록"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => submit(false)}>
          임시저장
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/market">취소</Link>
        </Button>
      </div>
    </div>
  );
}
