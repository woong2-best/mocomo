"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUsedListing } from "@/actions/used-market";
import { UsedImageComposer } from "@/components/media/post-media-composer";
import { MAX_USED_LISTING_PRICE, USED_CATEGORIES } from "@/lib/used-market";
import { USED_PRODUCT_TYPES } from "@/lib/used-catalog";
import { UsedWorkTitleField } from "@/components/used/used-work-title-field";
import {
  AUCTION_DURATION_OPTIONS,
  BID_INCREMENT_PRESETS,
  DEFAULT_BID_INCREMENT,
} from "@/lib/used-auction";
import { USED_RESTRICTED_OPTIONS } from "@/lib/used-youth-protection";
import type { UsedRestrictedKind } from "@prisma/client";
import { UsedRegionSelect } from "@/components/used/used-region-select";
import { UsedMeetMapPicker } from "@/components/used/used-meet-map-picker";
import type { MeetCoords } from "@/lib/used-market";
import { formatUsedRegion, getSigunguList, KOREA_SIDO, parseUsedRegion } from "@/lib/korea-regions";
import { UsedAiDraftButton } from "@/components/used/used-ai-draft-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UsedListingAiDraft } from "@/lib/used-listing-ai";
import { cn } from "@/lib/utils";

const PRICE_OVER_LIMIT_MSG = "최대 21억 원까지 입력할 수 있습니다.";

export function UsedPostForm({
  defaultRegion,
  sellerAdultVerified = false,
}: {
  defaultRegion?: string;
  sellerAdultVerified?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState("GOODS");
  const [workTitle, setWorkTitle] = useState("");
  const [productType, setProductType] = useState("");
  const initialRegion = (() => {
    if (defaultRegion && parseUsedRegion(defaultRegion)) return defaultRegion;
    return formatUsedRegion(KOREA_SIDO[0].short, getSigunguList(KOREA_SIDO[0].id)[0] ?? "종로구");
  })();
  const [region, setRegion] = useState(initialRegion);
  const [meetPlace, setMeetPlace] = useState("");
  const [meetCoords, setMeetCoords] = useState<MeetCoords | null>(null);
  const [restrictedKind, setRestrictedKind] = useState<UsedRestrictedKind>("NONE");
  const [saleType, setSaleType] = useState<"FIXED" | "AUCTION">("FIXED");
  const [auctionHours, setAuctionHours] = useState(24);
  const [bidIncrement, setBidIncrement] = useState(DEFAULT_BID_INCREMENT);
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numericPrice = Number(price) || 0;
  const priceOverLimit =
    !isFree && price.trim() !== "" && Number.isFinite(numericPrice) && numericPrice > MAX_USED_LISTING_PRICE;

  function applyAiDraft(draft: UsedListingAiDraft) {
    setTitle(draft.title);
    setDescription(draft.description);
    if (
      !isFree &&
      saleType === "FIXED" &&
      draft.suggestedPrice != null &&
      draft.suggestedPrice > 0 &&
      !price.trim()
    ) {
      setPrice(String(draft.suggestedPrice));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (priceOverLimit) {
      setLoading(false);
      return;
    }
    if (mediaUploading) {
      setError("사진 업로드가 진행 중입니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
      return;
    }
    if (saleType === "AUCTION" && isFree) {
      setError("경매는 나눔(무료)로 등록할 수 없습니다.");
      setLoading(false);
      return;
    }
    const badImages = images.filter(
      (u) =>
        !u.startsWith("https://") ||
        u.startsWith("blob:") ||
        u.startsWith("/uploads/")
    );
    if (images.length > 0 && badImages.length > 0) {
      setError(
        "사진 업로드가 완료되지 않았습니다. 사진을 다시 추가하고 「적용」 후 업로드가 끝날 때까지 기다려 주세요."
      );
      setLoading(false);
      return;
    }

    const submitPrice = isFree ? 0 : numericPrice;
    const res = await createUsedListing({
      title,
      description,
      price: submitPrice,
      category,
      region,
      meetPlace: meetPlace.trim() || undefined,
      meetLat: meetCoords?.lat,
      meetLng: meetCoords?.lng,
      images,
      workTitle: workTitle.trim() || undefined,
      productType: productType || undefined,
      restrictedKind,
      saleType,
      ...(saleType === "AUCTION"
        ? {
            auctionHours,
            bidIncrement,
            buyNowPrice: buyNowPrice.trim() ? Number(buyNowPrice) : undefined,
            reservePrice: reservePrice.trim() ? Number(reservePrice) : undefined,
          }
        : {}),
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("listingId" in res && res.listingId) {
      router.push(`/used/${res.listingId}`);
      return;
    }
    setError("등록에 실패했습니다. 다시 시도해 주세요.");
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-8">
      <UsedImageComposer
        images={images}
        onChange={setImages}
        max={10}
        disabled={loading}
        onUploadingChange={setMediaUploading}
      />

      <UsedAiDraftButton
        images={images}
        category={category}
        productType={productType}
        workTitle={workTitle}
        region={region}
        saleType={saleType}
        isFree={isFree}
        partialTitle={title}
        partialDescription={description}
        disabled={loading || mediaUploading}
        onApply={applyAiDraft}
      />

      <Input
        placeholder="글 제목 (예: 원신 피규어 판매)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-xl h-11"
        required
      />

      <textarea
        placeholder="자세한 설명, 거래 방식, 하자 여부 등"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full min-h-[120px] rounded-xl border border-border p-3 text-sm"
        required
      />

      <div className="flex gap-2 p-1 rounded-xl bg-muted/50 border">
        <button
          type="button"
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-semibold",
            saleType === "FIXED" ? "bg-background shadow-sm" : "text-muted-foreground"
          )}
          onClick={() => setSaleType("FIXED")}
        >
          일반 판매
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-semibold",
            saleType === "AUCTION" ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" : "text-muted-foreground"
          )}
          onClick={() => {
            setSaleType("AUCTION");
            setIsFree(false);
          }}
        >
          경매
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFree}
            disabled={saleType === "AUCTION"}
            onChange={(e) => {
              setIsFree(e.target.checked);
              if (e.target.checked) setPrice("");
            }}
          />
          나눔 (무료)
        </label>
      </div>
      {!isFree && (
        <div className="space-y-1.5">
          <Input
            type="number"
            placeholder={saleType === "AUCTION" ? "경매 시작가 (원)" : "가격 (원)"}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={cn(
              "rounded-xl",
              priceOverLimit && "border-destructive focus-visible:ring-destructive"
            )}
            min={0}
            aria-invalid={priceOverLimit}
            required
          />
          {priceOverLimit && (
            <p className="text-sm text-destructive font-medium">{PRICE_OVER_LIMIT_MSG}</p>
          )}
        </div>
      )}

      {saleType === "AUCTION" && !isFree && (
        <div className="space-y-3 rounded-xl border border-orange-500/25 bg-orange-500/5 p-3">
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">경매 설정</p>
          <div>
            <label className="text-xs text-muted-foreground">경매 기간</label>
            <select
              className="w-full h-10 mt-1 rounded-lg border px-2 text-sm"
              value={auctionHours}
              onChange={(e) => setAuctionHours(Number(e.target.value))}
            >
              {AUCTION_DURATION_OPTIONS.map((d) => (
                <option key={d.hours} value={d.hours}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">입찰 단위 (최소 상향)</label>
            <select
              className="w-full h-10 mt-1 rounded-lg border px-2 text-sm"
              value={bidIncrement}
              onChange={(e) => setBidIncrement(Number(e.target.value))}
            >
              {BID_INCREMENT_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            type="number"
            placeholder="즉시구매가 (선택)"
            value={buyNowPrice}
            onChange={(e) => setBuyNowPrice(e.target.value)}
            className="rounded-xl h-10"
            min={0}
          />
          <Input
            type="number"
            placeholder="최저 낙찰가 (선택, 미달 시 유찰)"
            value={reservePrice}
            onChange={(e) => setReservePrice(e.target.value)}
            className="rounded-xl h-10"
            min={0}
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            마감 5분 전 입찰 시 5분 연장 (최대 5회). 입찰·낙찰·갱신 알림이 발송됩니다. 낙찰 후 채팅으로
            거래를 이어가세요.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">청소년 보호 품목</label>
        <select
          className="w-full h-11 rounded-xl border border-border px-3 text-sm"
          value={restrictedKind}
          onChange={(e) => setRestrictedKind(e.target.value as UsedRestrictedKind)}
        >
          {USED_RESTRICTED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {restrictedKind !== "NONE" && !sellerAdultVerified && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            이 품목을 등록하려면{" "}
            <Link href="/used/adult-verify?callbackUrl=/used/new" className="underline font-medium">
              성인 인증
            </Link>
            이 필요합니다.
          </p>
        )}
        {restrictedKind !== "NONE" && (
          <p className="text-[11px] text-muted-foreground">
            구매·입찰자도 만 19세 이상 성인 인증이 필요합니다.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UsedWorkTitleField value={workTitle} onChange={setWorkTitle} disabled={loading} />
        <div className="space-y-1">
          <label htmlFor="product-type" className="text-sm font-medium">
            상품 종류
          </label>
          <select
            id="product-type"
            className="w-full h-11 rounded-xl border border-border px-3 text-sm"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            disabled={loading}
          >
            <option value="">선택 (권장)</option>
            {USED_PRODUCT_TYPES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <select
        className="w-full h-11 rounded-xl border border-border px-3 text-sm"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {USED_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <UsedRegionSelect
        value={region}
        onChange={(r) => {
          setRegion(r);
          setMeetCoords(null);
        }}
      />

      <UsedMeetMapPicker
        region={region}
        meetPlace={meetPlace}
        onMeetPlaceChange={setMeetPlace}
        coords={meetCoords}
        onCoordsChange={setMeetCoords}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        variant="secondary"
        disabled={loading || priceOverLimit}
        size="lg"
        className="w-full"
      >
        {loading ? "등록 중…" : saleType === "AUCTION" ? "경매 등록" : "중고거래 글 올리기"}
      </Button>
    </form>
  );
}
