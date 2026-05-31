"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUsedListing } from "@/actions/used-market";
import { uploadImageBlob } from "@/lib/client-upload";
import { MAX_USED_LISTING_PRICE, USED_CATEGORIES } from "@/lib/used-market";
import {
  AUCTION_DURATION_OPTIONS,
  BID_INCREMENT_PRESETS,
  DEFAULT_BID_INCREMENT,
} from "@/lib/used-auction";
import { UsedRegionSelect } from "@/components/used/used-region-select";
import { formatUsedRegion, getSigunguList, KOREA_SIDO, parseUsedRegion } from "@/lib/korea-regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRICE_OVER_LIMIT_MSG = "최대 21억 원까지 입력할 수 있습니다.";

export function UsedPostForm({ defaultRegion }: { defaultRegion?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState("GOODS");
  const initialRegion = (() => {
    if (defaultRegion && parseUsedRegion(defaultRegion)) return defaultRegion;
    return formatUsedRegion(KOREA_SIDO[0].short, getSigunguList(KOREA_SIDO[0].id)[0] ?? "종로구");
  })();
  const [region, setRegion] = useState(initialRegion);
  const [meetPlace, setMeetPlace] = useState("");
  const [saleType, setSaleType] = useState<"FIXED" | "AUCTION">("FIXED");
  const [auctionHours, setAuctionHours] = useState(24);
  const [bidIncrement, setBidIncrement] = useState(DEFAULT_BID_INCREMENT);
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numericPrice = Number(price) || 0;
  const priceOverLimit =
    !isFree && price.trim() !== "" && Number.isFinite(numericPrice) && numericPrice > MAX_USED_LISTING_PRICE;

  async function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10 - images.length)) {
        const url = await uploadImageBlob(file as Blob, file.name);
        setImages((prev) => [...prev, url].slice(0, 10));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
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
    if (saleType === "AUCTION" && isFree) {
      setError("경매는 나눔(무료)로 등록할 수 없습니다.");
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
      images,
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
    if ("listingId" in res && res.listingId) router.push(`/used/${res.listingId}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-8">
      <div>
        <label className="text-sm font-medium">사진 (최대 10장)</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
          ))}
          {images.length < 10 && (
            <label className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer bg-muted/40 hover:bg-muted/60">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              )}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onImages} />
            </label>
          )}
        </div>
      </div>

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

      <UsedRegionSelect value={region} onChange={setRegion} />

      <Input
        placeholder="거래 희망 장소 (예: 신호등 앞, OO역 2번 출구)"
        value={meetPlace}
        onChange={(e) => setMeetPlace(e.target.value)}
        className="rounded-xl h-11"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        variant="secondary"
        disabled={loading || uploading || priceOverLimit}
        size="lg"
        className="w-full"
      >
        {loading ? "등록 중…" : saleType === "AUCTION" ? "경매 등록" : "중고거래 글 올리기"}
      </Button>
    </form>
  );
}
