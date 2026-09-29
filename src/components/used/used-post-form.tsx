"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUsedListing } from "@/actions/used-market";
import { UsedImageComposer } from "@/components/media/post-media-composer";
import {
  DEFAULT_USED_CURRENCY,
  isKoreaUsedMarketCountry,
  maxUsedListingPrice,
  maxUsedListingPriceLabel,
  type UsedCurrency,
} from "@/lib/used-market";
import { coerceSubcultureListingFields } from "@/lib/subculture-commerce/types";
import { productTypeForSellKind, USED_CONDITION_OPTIONS, USED_SELL_KINDS } from "@/lib/used-catalog";
import { parseUsdDollarsToCents, sanitizeUsdDollarInput } from "@/lib/money";
import { UsedWorkTitleField } from "@/components/used/used-work-title-field";
import { UsedMeetMapPicker } from "@/components/used/used-meet-map-picker";
import type { MeetCoords } from "@/lib/used-market";
import {
  formatUsedRegion,
  getSidoById,
  KOREA_SIDO,
  KOREA_SIGUNGU_BY_SIDO,
  parseUsedRegion,
  USED_SHIPPING_REGION,
} from "@/lib/korea-regions";
import { defaultUsedRegionForCountry } from "@/lib/used-regions-global";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

function priceOverLimitMsg(locale: string | undefined, currency: UsedCurrency) {
  const max = maxUsedListingPriceLabel(currency);
  return uiText(locale, `최대 ${max}까지 입력할 수 있습니다.`, `Enter up to ${max}.`);
}

function parseFormPrice(raw: string, currency: UsedCurrency): number {
  if (currency === "usd") return parseUsdDollarsToCents(raw);
  return Math.floor(Number(raw.replace(/,/g, "")) || 0);
}

function listingCurrencyChoices(
  country: string,
  locale: string | undefined
): { id: UsedCurrency; label: string }[] {
  if (isKoreaUsedMarketCountry(country)) {
    return [
      { id: "krw", label: uiText(locale, "원(KRW)", "KRW") },
      { id: "usd", label: uiText(locale, "달러(USD)", "USD") },
    ];
  }
  return [{ id: "usd", label: uiText(locale, "달러(USD)", "USD") }];
}

function sellKindLabel(id: string, locale: string | undefined): string {
  const map: Record<string, [string, string]> = {
    FIGURE: ["피규어", "Figure"],
    GOODS: ["굿즈", "Goods"],
    BOOK: ["도서", "Books"],
    COSPLAY: ["코스프레", "Cosplay"],
    DIGITAL: ["디지털", "Digital"],
  };
  const pair = map[id];
  if (pair) return uiText(locale, pair[0], pair[1]);
  return USED_SELL_KINDS.find((p) => p.id === id)?.label ?? id;
}

function MarketCheckOption({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="inline-flex items-center gap-1.5 py-1.5 pr-3 text-[15px]"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border",
          checked ? "border-foreground bg-foreground text-background" : "border-foreground/70"
        )}
      >
        {checked ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path
              d="M2 6.2 4.6 9 10 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  );
}

export function UsedPostForm({
  defaultRegion,
  sellerCountryCode = "KR",
}: {
  defaultRegion?: string;
  sellerAdultVerified?: boolean;
  sellerCountryCode?: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const sellerCountry = sellerCountryCode.toUpperCase();
  const korea = isKoreaUsedMarketCountry(sellerCountry);
  const parsedDefault = defaultRegion ? parseUsedRegion(defaultRegion) : null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<UsedCurrency>(
    korea ? DEFAULT_USED_CURRENCY : "usd"
  );
  const [giveaway, setGiveaway] = useState(false);
  const [tradeMode, setTradeMode] = useState<"SELL" | "TRADE">("SELL");
  const [workTitle, setWorkTitle] = useState("");
  const [animeSlug, setAnimeSlug] = useState<string | null>(null);
  const [sellKind, setSellKind] = useState("");
  const [conditionGrade, setConditionGrade] = useState("NEW");
  const [sidoId, setSidoId] = useState(parsedDefault?.sidoId ?? KOREA_SIDO[0]?.id ?? "seoul");
  const [sigungu, setSigungu] = useState(
    parsedDefault?.sigungu ?? KOREA_SIGUNGU_BY_SIDO.seoul?.[0] ?? "종로구"
  );
  const [region, setRegion] = useState(
    parsedDefault
      ? defaultRegion ?? formatUsedRegion(KOREA_SIDO[0]?.short ?? "서울", "종로구")
      : korea
        ? formatUsedRegion(KOREA_SIDO[0]?.short ?? "서울", KOREA_SIGUNGU_BY_SIDO.seoul?.[0] ?? "종로구")
        : defaultUsedRegionForCountry(sellerCountry)
  );
  const [regionText, setRegionText] = useState("");
  const [meetPlace, setMeetPlace] = useState("");
  const [meetCoords, setMeetCoords] = useState<MeetCoords | null>(null);
  const [isNsfw, setIsNsfw] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isTrade = !giveaway && tradeMode === "TRADE";
  const numericPrice = parseFormPrice(price, currency);
  const priceMax = maxUsedListingPrice(currency);
  const priceOverLimit =
    !giveaway && !isTrade && price.trim() !== "" && Number.isFinite(numericPrice) && numericPrice > priceMax;

  function setSido(nextId: string) {
    if (nextId === "__shipping__") {
      setSidoId("__shipping__");
      setRegion(USED_SHIPPING_REGION);
      setMeetCoords(null);
      return;
    }
    const first = KOREA_SIGUNGU_BY_SIDO[nextId]?.[0] ?? "";
    setSidoId(nextId);
    setSigungu(first);
    setRegion(formatUsedRegion(getSidoById(nextId)?.short ?? "", first));
    setMeetCoords(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!sellKind) {
      setError(uiText(locale, "상품 종류를 선택해 주세요.", "Choose a product type."));
      return;
    }
    if (!title.trim()) {
      setError(uiText(locale, "제목을 입력해 주세요.", "Enter a title."));
      return;
    }
    if (images.length === 0) {
      setError(uiText(locale, "상품 사진을 추가해 주세요.", "Add at least one photo."));
      return;
    }
    if (priceOverLimit) return;
    if (mediaUploading) {
      setError(
        uiText(
          locale,
          "사진 업로드가 진행 중입니다. 잠시 후 다시 시도해 주세요.",
          "Photos are still uploading. Try again in a moment."
        )
      );
      return;
    }
    const submitPrice = giveaway || isTrade ? 0 : numericPrice;
    if (!giveaway && !isTrade && submitPrice <= 0) {
      setError(uiText(locale, "가격을 입력해 주세요.", "Enter a price."));
      return;
    }
    const submitRegion = korea
      ? sidoId === "__shipping__"
        ? USED_SHIPPING_REGION
        : formatUsedRegion(getSidoById(sidoId)?.short ?? "서울", sigungu)
      : region === "Shipping"
        ? "Shipping"
        : regionText.trim() || region;
    if (!submitRegion.trim()) {
      setError(uiText(locale, "거래 지역을 선택해 주세요.", "Choose a trade region."));
      return;
    }

    setLoading(true);
    const res = await createUsedListing({
      title: title.trim(),
      description: description.trim(),
      price: submitPrice,
      currency,
      category: sellKind,
      categories: [sellKind],
      region: submitRegion,
      meetPlace: meetPlace.trim() || undefined,
      meetLat: meetCoords?.lat,
      meetLng: meetCoords?.lng,
      meetCountry: sellerCountry,
      images,
      workTitle: workTitle.trim() || undefined,
      animeSlug: animeSlug ?? undefined,
      productType: productTypeForSellKind(sellKind),
      ...coerceSubcultureListingFields({
        conditionGrade,
        tradeMode: isTrade ? "TRADE" : "SELL",
      }),
      isNsfw,
      saleType: "FIXED",
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("listingId" in res && res.listingId) {
      router.push(`/market/${res.listingId}`);
      return;
    }
    setError(uiText(locale, "등록에 실패했습니다. 다시 시도해 주세요.", "Could not publish. Please try again."));
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <UsedImageComposer
        images={images}
        onChange={setImages}
        max={10}
        disabled={loading}
        onUploadingChange={setMediaUploading}
      />

      <label className="block space-y-2">
        <span className="text-[15px] font-bold">{uiText(locale, "제목", "Title")}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={uiText(locale, "제목을 입력해 주세요.", "Enter a title")}
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[15px] font-bold">{uiText(locale, "자세한 설명", "Description")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={uiText(
            locale,
            "올릴 물건의 내용을 작성해 주세요. 원활하고 안전한 트레이드를 위해 상세한 정보를 입력해 주세요.",
            "Describe your item. Detailed info helps buyers trade safely."
          )}
          className="min-h-[140px] w-full rounded-xl border border-border bg-background p-3.5 text-[15px]"
        />
      </label>

      <div className="space-y-2">
        <p className="text-[15px] font-bold">{uiText(locale, "거래 방식", "Listing type")}</p>
        <div className="flex flex-wrap">
          <MarketCheckOption
            label={uiText(locale, "판매하기", "Sell")}
            checked={!giveaway && !isTrade}
            onPress={() => {
              setGiveaway(false);
              setTradeMode("SELL");
            }}
          />
          <MarketCheckOption
            label={uiText(locale, "나눔하기", "Give away")}
            checked={giveaway}
            onPress={() => {
              setGiveaway(true);
              setTradeMode("SELL");
              setPrice("0");
            }}
          />
          <MarketCheckOption
            label={uiText(locale, "교환", "Trade")}
            checked={isTrade}
            onPress={() => {
              setGiveaway(false);
              setTradeMode("TRADE");
              setPrice("0");
            }}
          />
        </div>
        {!giveaway && !isTrade ? (
          <div className="space-y-2 pt-1">
            <p className="text-[15px] font-bold">{uiText(locale, "가격", "Price")}</p>
            <div className="flex flex-wrap">
              {listingCurrencyChoices(sellerCountry, locale).map((c) => (
                <MarketCheckOption
                  key={c.id}
                  label={c.label}
                  checked={currency === c.id}
                  onPress={() => {
                    setCurrency(c.id);
                    setPrice("");
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{currency === "usd" ? "$" : "₩"}</span>
              <input
                value={price}
                onChange={(e) =>
                  setPrice(currency === "usd" ? sanitizeUsdDollarInput(e.target.value) : e.target.value)
                }
                inputMode={currency === "usd" ? "decimal" : "numeric"}
                placeholder={uiText(locale, "가격을 입력해 주세요.", "Enter price")}
                className={cn(
                  "h-12 flex-1 rounded-xl border border-border bg-background px-3.5 text-[15px]",
                  priceOverLimit && "border-destructive"
                )}
              />
            </div>
            {priceOverLimit ? (
              <p className="text-sm text-destructive">{priceOverLimitMsg(locale, currency)}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <UsedWorkTitleField
        value={workTitle}
        onChange={setWorkTitle}
        animeSlug={animeSlug}
        onAnimeSlugChange={setAnimeSlug}
        disabled={loading}
      />

      <div className="space-y-2">
        <p className="text-[15px] font-bold">{uiText(locale, "상품 종류", "Product type")}</p>
        <div className="flex flex-wrap">
          {USED_SELL_KINDS.map((p) => (
            <MarketCheckOption
              key={p.id}
              label={sellKindLabel(p.id, locale)}
              checked={sellKind === p.id}
              onPress={() => setSellKind(p.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[15px] font-bold">{uiText(locale, "상태", "Condition")}</p>
        <div className="flex flex-wrap">
          {USED_CONDITION_OPTIONS.map((o) => (
            <MarketCheckOption
              key={o.id}
              label={o.label}
              checked={conditionGrade === o.id}
              onPress={() => setConditionGrade(o.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[15px] font-bold">{uiText(locale, "거래 설정", "Trade settings")}</p>
        {korea ? (
          <>
            <div className="grid grid-cols-4 gap-x-1">
              {KOREA_SIDO.map((s) => (
                <MarketCheckOption
                  key={s.id}
                  label={s.short}
                  checked={sidoId === s.id}
                  onPress={() => setSido(s.id)}
                />
              ))}
              <MarketCheckOption
                label={uiText(locale, "전국 배송", "Nationwide shipping")}
                checked={sidoId === "__shipping__"}
                onPress={() => setSido("__shipping__")}
              />
            </div>
            {sidoId !== "__shipping__" ? (
              <div className="grid grid-cols-4 gap-x-1">
                {(KOREA_SIGUNGU_BY_SIDO[sidoId] ?? []).map((unit) => (
                  <MarketCheckOption
                    key={unit}
                    label={unit}
                    checked={sigungu === unit}
                    onPress={() => {
                      setSigungu(unit);
                      setRegion(formatUsedRegion(getSidoById(sidoId)?.short ?? "", unit));
                      setMeetCoords(null);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-wrap">
              <MarketCheckOption
                label={uiText(locale, "배송", "Shipping")}
                checked={region === "Shipping"}
                onPress={() => {
                  setRegion("Shipping");
                  setMeetCoords(null);
                }}
              />
              <MarketCheckOption
                label={uiText(locale, "직거래 도시", "Local meetup city")}
                checked={region !== "Shipping"}
                onPress={() => {
                  setRegion("");
                  setMeetCoords(null);
                }}
              />
            </div>
            {region !== "Shipping" ? (
              <input
                value={regionText}
                onChange={(e) => setRegionText(e.target.value)}
                placeholder={uiText(locale, "예: Tokyo, Los Angeles", "e.g. Tokyo, Los Angeles")}
                className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px]"
              />
            ) : null}
          </>
        )}
        <UsedMeetMapPicker
          region={region}
          country={sellerCountry}
          meetPlace={meetPlace}
          onMeetPlaceChange={setMeetPlace}
          coords={meetCoords}
          onCoordsChange={setMeetCoords}
        />
      </div>

      <MarketCheckOption
        label={uiText(locale, "NSFW · 민감한 콘텐츠", "NSFW · sensitive content")}
        checked={isNsfw}
        onPress={() => setIsNsfw((v) => !v)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || priceOverLimit || mediaUploading}
        className="fixed inset-x-4 bottom-[calc(var(--mobile-nav-h,0px)+1rem)] z-40 h-12 rounded-full bg-folk-terracotta text-base font-extrabold text-white shadow-md hover:bg-folk-terracotta/90 disabled:opacity-60 md:static md:inset-auto md:mt-2 md:w-full"
      >
        {loading ? uiText(locale, "등록 중…", "Publishing…") : uiText(locale, "작성 완료", "Publish")}
      </button>
    </form>
  );
}
