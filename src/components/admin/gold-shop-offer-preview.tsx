import type { AdminGoldShopOfferDto } from "@/lib/apt/economy/admin-gold-shop-service";
import { cn } from "@/lib/utils";

/** 앱 상점 카드와 유사한 미리보기 */
export function GoldShopOfferPreview({
  offer,
  className,
}: {
  offer: Pick<
    AdminGoldShopOfferDto,
    | "label"
    | "src"
    | "goldPrice"
    | "originalGoldPrice"
    | "discountPercent"
    | "featured"
    | "isNew"
    | "status"
  >;
  className?: string;
}) {
  const soldOut = offer.status === "sold_out";

  return (
    <div
      className={cn(
        "apt-game-shop-card relative mx-auto flex w-full max-w-[160px] flex-col items-center rounded-2xl p-3",
        className
      )}
    >
      {offer.featured && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[8px] font-black text-white">
          ★ 추천
        </span>
      )}
      {offer.isNew && !offer.featured && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-violet-500 px-1.5 py-0.5 text-[8px] font-black text-white">
          신상
        </span>
      )}
      {offer.discountPercent != null && offer.discountPercent > 0 && (
        <span className="absolute right-1.5 top-1.5 rounded-md bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white">
          -{offer.discountPercent}%
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={offer.src} alt={offer.label} className="h-16 w-full object-contain" />
      <span className="mt-2 w-full truncate text-center text-[10px] font-bold text-[#5c4033]">
        {offer.label}
      </span>
      <span className="mt-1 text-[11px] font-black text-amber-700">
        {soldOut ? "품절" : `${offer.goldPrice.toLocaleString()} Gold`}
      </span>
      {offer.originalGoldPrice != null &&
        offer.originalGoldPrice > offer.goldPrice &&
        !soldOut && (
          <span className="text-[9px] text-[#a08968] line-through">
            {offer.originalGoldPrice.toLocaleString()}G
          </span>
        )}
      {offer.featured && (
        <div className="mt-2 text-[8px] text-amber-600">★★★★★ 추천</div>
      )}
    </div>
  );
}
