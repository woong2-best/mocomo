"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createUsedListing, updateUsedListing } from "@/actions/used-market";
import { UsedImageComposer } from "@/components/media/post-media-composer";
import {
  DEFAULT_USED_CURRENCY,
  isKoreaUsedMarketCountry,
  maxUsedListingPrice,
  maxUsedListingPriceLabel,
  type UsedCurrency,
} from "@/lib/used-market";
import { coerceSubcultureListingFields } from "@/lib/subculture-commerce/types";
import {
  productTypeForSellKind,
  sellKindFromListing,
  usedPriceInputValue,
  USED_CONDITION_OPTIONS,
  USED_SELL_KINDS,
} from "@/lib/used-catalog";
import { listingImages } from "@/lib/used-market";
import {
  parseUsdDollarsToCents,
  sanitizeKrwWonInput,
  sanitizeUsdDollarInput,
} from "@/lib/money";
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
} from "@/lib/korea-regions";
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
  editListing,
}: {
  defaultRegion?: string;
  sellerAdultVerified?: boolean;
  sellerCountryCode?: string;
  editListing?: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency?: string | null;
    category?: string | null;
    productType?: string | null;
    workTitle?: string | null;
    animeSlug?: string | null;
    conditionGrade?: string | null;
    tradeMode?: string | null;
    region: string;
    meetPlace?: string | null;
    meetLat?: number | null;
    meetLng?: number | null;
    images: unknown;
    isNsfw?: boolean;
    saleType?: string | null;
  };
}) {
  const router = useRouter();
  const { t } = useLocale();
  const sellerCountry = sellerCountryCode.toUpperCase();
  const korea = isKoreaUsedMarketCountry(sellerCountry);
  const parsedDefault = defaultRegion ? parseUsedRegion(defaultRegion) : null;
  const editing = !!editListing;
  const [title, setTitle] = useState(editListing?.title ?? "");
  const [description, setDescription] = useState(editListing?.description ?? "");
  const [price, setPrice] = useState(
    editListing ? usedPriceInputValue(editListing.price, editListing.currency) : ""
  );
  const [currency, setCurrency] = useState<UsedCurrency>(
    (editListing?.currency as UsedCurrency | undefined) ?? (korea ? DEFAULT_USED_CURRENCY : "usd")
  );
  const [giveaway, setGiveaway] = useState(
    !!editListing && editListing.price === 0 && editListing.tradeMode !== "TRADE"
  );
  const [tradeMode, setTradeMode] = useState<"SELL" | "TRADE">(
    editListing?.tradeMode === "TRADE" ? "TRADE" : "SELL"
  );
  const [workTitle, setWorkTitle] = useState(editListing?.workTitle ?? "");
  const [animeSlug, setAnimeSlug] = useState<string | null>(editListing?.animeSlug ?? null);
  const [sellKind, setSellKind] = useState(
    editListing ? sellKindFromListing(editListing.category, editListing.productType) : ""
  );
  const [conditionGrade, setConditionGrade] = useState(editListing?.conditionGrade ?? "NEW");
  const [region, setRegion] = useState(
    editListing?.region
      ? editListing.region
      : parsedDefault && defaultRegion
        ? defaultRegion
        : korea
          ? formatUsedRegion(
              KOREA_SIDO[0]?.short ?? t("lib.maps.sxxr0"),
              KOREA_SIGUNGU_BY_SIDO.seoul?.[0] ?? t("used.su9n85")
            )
          : ""
  );
  const [meetPlace, setMeetPlace] = useState(editListing?.meetPlace ?? "");
  const [meetCoords, setMeetCoords] = useState<MeetCoords | null>(
    editListing?.meetLat != null && editListing?.meetLng != null
      ? { lat: editListing.meetLat, lng: editListing.meetLng }
      : null
  );
  const [isNsfw, setIsNsfw] = useState(!!editListing?.isNsfw);
  const [auction, setAuction] = useState(editListing?.saleType === "AUCTION");
  const [auctionHours, setAuctionHours] = useState(48);
  const [itemTrack, setItemTrack] = useState<"physical" | "digital">(
    editListing?.category === "DIGITAL" ? "digital" : "physical"
  );
  const [digitalKind, setDigitalKind] = useState<"ready" | "commission">("ready");
  const [digitalProduct, setDigitalProduct] = useState(editListing?.productType || "VTUBER_3D");
  const [images, setImages] = useState<string[]>(
    editListing ? listingImages(editListing.images) : []
  );
  const [mediaUploading, setMediaUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isTrade = !giveaway && !auction && tradeMode === "TRADE";
  const numericPrice = parseFormPrice(price, currency);
  const priceMax = maxUsedListingPrice(currency);
  const priceOverLimit =
    !giveaway && !isTrade && price.trim() !== "" && Number.isFinite(numericPrice) && numericPrice > priceMax;

  const syncRegionFromMapLabel = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      if (korea) {
        const inferred = inferUsedRegionFromGeocodeLabel(trimmed);
        if (inferred) {
          setRegion(formatUsedRegion(getSidoById(inferred.sidoId)?.short ?? "", inferred.sigungu));
          return;
        }
      }
      setRegion(trimmed);
    },
    [korea]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digital = itemTrack === "digital";
    if (!digital && !sellKind) {
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
    if (!digital && !auction && !meetCoords) {
      setError(t("ui.choose_a_trade_region"));
      return;
    }
    const submitRegion = digital || auction ? "Shipping" : region.trim();
    if (!submitRegion) {
      setError(t("ui.choose_a_trade_region"));
      return;
    }

    setLoading(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      price: submitPrice,
      currency,
      region: submitRegion,
      meetPlace: digital || auction ? undefined : meetPlace.trim() || undefined,
      meetLat: digital || auction ? undefined : meetCoords?.lat,
      meetLng: digital || auction ? undefined : meetCoords?.lng,
      meetCountry: sellerCountry,
      images,
      workTitle: workTitle.trim() || undefined,
      animeSlug: animeSlug ?? undefined,
      productType: digital ? digitalProduct : productTypeForSellKind(sellKind),
      ...coerceSubcultureListingFields({
        conditionGrade,
        tradeMode: isTrade ? "TRADE" : "SELL",
      }),
      isNsfw,
    };
    const res = editing
      ? await updateUsedListing(editListing.id, payload)
      : await createUsedListing({
          ...payload,
          category: digital ? "DIGITAL" : sellKind,
          categories: [digital ? "DIGITAL" : sellKind],
          saleType: !digital && auction ? "AUCTION" : "FIXED",
          auctionHours: !digital && auction ? auctionHours : undefined,
          digitalKind: digital ? digitalKind : undefined,
        });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    const nextId = editing ? editListing.id : "listingId" in res ? res.listingId : null;
    if (nextId) {
      router.push(`/market/${nextId}`);
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
            label={t("market.track.physicalItem")}
            checked={itemTrack === "physical"}
            onPress={() => setItemTrack("physical")}
          />
          <MarketCheckOption
            label={t("market.track.digitalAsset")}
            checked={itemTrack === "digital"}
            onPress={() => {
              setItemTrack("digital");
              setAuction(false);
              setGiveaway(false);
            }}
          />
        </div>
        {itemTrack === "digital" ? (
          <div className="flex flex-wrap">
            <MarketCheckOption
              label={t("market.track.ready")}
              checked={digitalKind === "ready"}
              onPress={() => setDigitalKind("ready")}
            />
            <MarketCheckOption
              label={t("market.track.commission")}
              checked={digitalKind === "commission"}
              onPress={() => setDigitalKind("commission")}
            />
          </div>
        ) : (
          <div className="flex flex-wrap">
            <MarketCheckOption
              label={t("market.track.fixedPrice")}
              checked={!giveaway && !isTrade && !auction}
              onPress={() => {
                setGiveaway(false);
                setAuction(false);
                setTradeMode("SELL");
              }}
            />
            {!editing || auction ? (
              <MarketCheckOption
                label={t("ui.auction")}
                checked={auction}
                onPress={() => {
                  if (editing) return;
                  setAuction(true);
                  setGiveaway(false);
                  setTradeMode("SELL");
                }}
              />
            ) : null}
          </div>
        )}
        {itemTrack === "physical" && auction ? (
          <div className="flex flex-wrap">
            {[24, 48, 72].map((hours) => (
              <MarketCheckOption
                key={hours}
                label={`${t("market.track.deadline")} ${hours}h`}
                checked={auctionHours === hours}
                onPress={() => setAuctionHours(hours)}
              />
            ))}
          </div>
        ) : null}
        {!giveaway && !isTrade ? (
          <div className="space-y-2 pt-1">
            <p className="text-[15px] font-bold">{auction ? t("ui.starting_bid") : t("ui.price")}</p>
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
                  setPrice(
                    currency === "usd"
                      ? sanitizeUsdDollarInput(e.target.value)
                      : sanitizeKrwWonInput(e.target.value)
                  )
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
          {(itemTrack === "digital"
            ? [
                { id: "VTUBER_3D", key: "market.track.vtuber" },
                { id: "STREAMER_ASSET", key: "market.track.streamer" },
                { id: "EMOTES_BADGES", key: "market.track.emotes" },
                { id: "ILLUSTRATION", key: "market.track.illustration" },
                { id: "AUDIO_MUSIC", key: "market.track.audio" },
                { id: "CREATOR_RESOURCES", key: "market.track.resources" },
              ]
            : USED_SELL_KINDS.filter((p) => p.id !== "DIGITAL").map((p) => ({ id: p.id, key: "" }))
          ).map((p) => (
            <MarketCheckOption
              key={p.id}
              label={p.key ? t(p.key) : sellKindLabel(p.id)}
              checked={itemTrack === "digital" ? digitalProduct === p.id : sellKind === p.id}
              onPress={() => {
                if (itemTrack === "digital") setDigitalProduct(p.id);
                else setSellKind(p.id);
              }}
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

      {itemTrack === "digital" || auction ? null : (
      <div className="space-y-3">
        <p className="text-[15px] font-bold">{t("ui.local_meetup_city")}</p>
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
      )}

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
        {loading ? t("ui.publishing") : editing ? t("ui.save_changes") : t("ui.publish")}
      </button>
    </form>
  );
}
