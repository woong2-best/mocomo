"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useState } from "react";
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
  inferUsedRegionFromGeocodeLabel,
  parseUsedRegion,
  USED_SHIPPING_REGION,
} from "@/lib/korea-regions";
import { defaultUsedRegionForCountry } from "@/lib/used-regions-global";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

function priceOverLimitMsg(currency: UsedCurrency) {
  const max = maxUsedListingPriceLabel(currency);
  return t("used.maxInputHint", { max });
}

function parseFormPrice(raw: string, currency: UsedCurrency): number {
  if (currency === "usd") return parseUsdDollarsToCents(raw);
  return Math.floor(Number(raw.replace(/,/g, "")) || 0);
}

function listingCurrencyChoices(country: string): { id: UsedCurrency; label: string }[] {
  if (isKoreaUsedMarketCountry(country)) {
    return [
      { id: "krw", label: t("ui.krw") },
      { id: "usd", label: t("ui.usd") },
    ];
  }
  return [{ id: "usd", label: t("ui.usd") }];
}

function sellKindLabel(id: string): string {
  const map: Record<string, string> = {
    FIGURE: "used.sellKind.figure",
    GOODS: "used.sellKind.goods",
    BOOK: "used.sellKind.book",
    COSPLAY: "used.sellKind.cosplay",
    DIGITAL: "used.sellKind.digital",
  };
  const key = map[id];
  if (key) return t(key);
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
  const { t } = useLocale();
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
  const [animeSlug, setAnimeSlug] = useState<string | null>{t("used.null_const_sellkind_setsellkind_usestate")}<MeetCoords | null>(null);
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

  const syncRegionFromMapLabel = useCallback(
    (label: string) => {
      if (!korea) return;
      const inferred = inferUsedRegionFromGeocodeLabel(label);
      if (!inferred) return;
      setSidoId(inferred.sidoId);
      setSigungu(inferred.sigungu);
      setRegion(formatUsedRegion(getSidoById(inferred.sidoId)?.short ?? "", inferred.sigungu));
    },
    [korea]
  );

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
      setError(t("ui.choose_a_product_type"));
      return;
    }
    if (!title.trim()) {
      setError(t("ui.enter_a_title"));
      return;
    }
    if (images.length === 0) {
      setError(t("ui.add_at_least_one_photo"));
      return;
    }
    if (priceOverLimit) return;
    if (mediaUploading) {
      setError(
        t("ui.photos_are_still_uploading_try_again")
      );
      return;
    }
    const submitPrice = giveaway || isTrade ? 0 : numericPrice;
    if (!giveaway && !isTrade && submitPrice <= 0) {
      setError(t("ui.enter_a_price"));
      return;
    }
    const submitRegion = korea
      ? sidoId === "__shipping__"
        ? USED_SHIPPING_REGION
        : formatUsedRegion(getSidoById(sidoId)?.short ?? t("used.sxxr0"), sigungu)
      : region === "Shipping"
        ? "Shipping"
        : regionText.trim() || region;
    if (!submitRegion.trim()) {
      setError(t("ui.choose_a_trade_region"));
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
      setError(errorText(res.error));
      return;
    }
    if ("listingId" in res && res.listingId) {
      router.push(`/market/${res.listingId}`);
      return;
    }
    setError(t("ui.could_not_publish_please_try_again"));
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
        <span className="text-[15px] font-bold">{t("ui.title")}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("ui.enter_a_title_2")}
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[15px] font-bold">{t("ui.description")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("ui.describe_your_item_detailed_info_helps")}
          className="min-h-[140px] w-full rounded-xl border border-border bg-background p-3.5 text-[15px]"
        />
      </label>

      <div className="space-y-2">
        <p className="text-[15px] font-bold">{t("ui.listing_type")}</p>
        <div className="flex flex-wrap">
          <MarketCheckOption
            label={t("ui.sell")}
            checked={!giveaway && !isTrade}
            onPress={() => {
              setGiveaway(false);
              setTradeMode("SELL");
            }}
          />
          <MarketCheckOption
            label={t("ui.give_away")}
            checked={giveaway}
            onPress={() => {
              setGiveaway(true);
              setTradeMode("SELL");
              setPrice("0");
            }}
          />
          <MarketCheckOption
            label={t("ui.trade")}
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
            <p className="text-[15px] font-bold">{t("ui.price")}</p>
            <div className="flex flex-wrap">
              {listingCurrencyChoices(sellerCountry).map((c) => (
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
                placeholder={t("ui.enter_price")}
                className={cn(
                  "h-12 flex-1 rounded-xl border border-border bg-background px-3.5 text-[15px]",
                  priceOverLimit && "border-destructive"
                )}
              />
            </div>
            {priceOverLimit ? (
              <p className="text-sm text-destructive">{priceOverLimitMsg(currency)}</p>
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
        <p className="text-[15px] font-bold">{t("ui.product_type")}</p>
        <div className="flex flex-wrap">
          {USED_SELL_KINDS.map((p) => (
            <MarketCheckOption
              key={p.id}
              label={sellKindLabel(p.id)}
              checked={sellKind === p.id}
              onPress={() => setSellKind(p.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[15px] font-bold">{t("ui.condition")}</p>
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
        <p className="text-[15px] font-bold">{t("ui.trade_settings")}</p>
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
                label={t("ui.nationwide_shipping")}
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
                label={t("ui.shipping")}
                checked={region === "Shipping"}
                onPress={() => {
                  setRegion("Shipping");
                  setMeetCoords(null);
                }}
              />
              <MarketCheckOption
                label={t("ui.local_meetup_city")}
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
                placeholder={t("ui.e_g_tokyo_los_angeles")}
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
          onGeocodeLabel={syncRegionFromMapLabel}
        />
      </div>

      <MarketCheckOption
        label={t("ui.nsfw_sensitive_content")}
        checked={isNsfw}
        onPress={() => setIsNsfw((v) => !v)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || priceOverLimit || mediaUploading}
        className="fixed inset-x-4 bottom-[calc(var(--mobile-nav-h,0px)+1rem)] z-40 h-12 rounded-full bg-folk-terracotta text-base font-extrabold text-white shadow-md hover:bg-folk-terracotta/90 disabled:opacity-60 md:static md:inset-auto md:mt-2 md:w-full"
      >
        {loading ? t("ui.publishing") : t("ui.publish")}
      </button>
    </form>
  );
}
