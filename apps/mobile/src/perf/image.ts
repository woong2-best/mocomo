import { Image } from "expo-image";
import { PixelRatio } from "react-native";

/** Disk+memory cache — default for all feed/profile images. */
export const IMAGE_CACHE_POLICY = "memory-disk" as const;

/**
 * Target decode width in device pixels so mid-range Android does not
 * decode full-resolution originals into the feed cell.
 */
export function feedMediaDecodeWidth(layoutWidth: number): number {
  const dpr = Math.min(PixelRatio.get(), 2.5);
  return Math.round(layoutWidth * dpr);
}

export function avatarDecodeSize(layoutSize: number): number {
  const dpr = Math.min(PixelRatio.get(), 2.5);
  return Math.round(layoutSize * dpr);
}

/** Prefetch a small set of upcoming URLs (bounded). */
export function prefetchImageUrls(urls: string[], limit = 6): void {
  const unique = [...new Set(urls.filter(Boolean))].slice(0, limit);
  for (const uri of unique) {
    void Image.prefetch(uri, { cachePolicy: IMAGE_CACHE_POLICY });
  }
}
