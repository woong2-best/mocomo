import { isSalePricedMedia } from "@/lib/paid-media-protection";

export const PAID_CONTENT_PROTECTION_SLIDE_ID = "__mocomo_content_protection_warning__";
export const PAID_VIDEO_PROTECTION_WARNING_MS = 6000;

export type ProtectionSlideMedia = {
  id?: string;
  type: string;
  url?: string;
  priceKrw?: number | null;
  instantPurchasePriceKrw?: number | null;
  locked?: boolean;
};

export function isProtectionWarningSlide(media: { id?: string; type?: string }): boolean {
  return (
    media.id === PAID_CONTENT_PROTECTION_SLIDE_ID ||
    media.type === "PROTECTION_WARNING"
  );
}

export function createProtectionWarningSlide(): ProtectionSlideMedia {
  return {
    id: PAID_CONTENT_PROTECTION_SLIDE_ID,
    type: "PROTECTION_WARNING",
    url: "",
    locked: false,
  };
}

/** Unlocked paid photos in a set get a synthetic warning slide prepended once. */
export function shouldPrependProtectionSlide(
  media: ProtectionSlideMedia[],
  opts: {
    postInstantPurchasePriceKrw?: number | null;
    isOwner?: boolean;
  } = {}
): boolean {
  if (opts.isOwner) return false;
  if (media.some(isProtectionWarningSlide)) return false;
  return media.some(
    (m) =>
      m.type === "IMAGE" &&
      !m.locked &&
      isSalePricedMedia(m.priceKrw, m.instantPurchasePriceKrw ?? opts.postInstantPurchasePriceKrw)
  );
}

export function withProtectionSlide<T extends ProtectionSlideMedia>(
  media: T[],
  opts: {
    postInstantPurchasePriceKrw?: number | null;
    isOwner?: boolean;
  } = {}
): T[] {
  if (!shouldPrependProtectionSlide(media, opts)) return media;
  return [createProtectionWarningSlide() as T, ...media];
}

/** Carousel/lightbox index after prepending the warning slide. */
export function protectionSlideAdjustedIndex(
  index: number,
  media: ProtectionSlideMedia[],
  opts: Parameters<typeof shouldPrependProtectionSlide>[1] = {}
): number {
  if (!shouldPrependProtectionSlide(media, opts)) return index;
  return index + 1;
}
