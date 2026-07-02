import { resolveInstantPurchasePrice } from "@/lib/content-access";

export const SALE_MEDIA_MIN_PRICE_KRW = 1;

export function isSalePricedMedia(
  mediaPriceKrw?: number | null,
  postInstantPurchasePriceKrw?: number | null
): boolean {
  return (
    resolveInstantPurchasePrice(mediaPriceKrw, postInstantPurchasePriceKrw) >=
    SALE_MEDIA_MIN_PRICE_KRW
  );
}

/** 잠금(블러) 상태가 아니고 판매가가 있으면 캡처·녹화 방지 적용 */
export function shouldProtectPaidMediaView(input: {
  mediaPriceKrw?: number | null;
  postInstantPurchasePriceKrw?: number | null;
  locked?: boolean;
}): boolean {
  if (input.locked) return false;
  return isSalePricedMedia(input.mediaPriceKrw, input.postInstantPurchasePriceKrw);
}
