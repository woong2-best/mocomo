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

/**
 * Profile header avatar layout. Every FolkAvatar decodes at this size so a
 * feed chip and the profile header share one memory-disk bitmap.
 */
export const AVATAR_CACHE_LAYOUT = 88;

export function avatarImageSource(uri: string): {
  uri: string;
  width: number;
  height: number;
  cacheKey: string;
} {
  const decode = avatarDecodeSize(AVATAR_CACHE_LAYOUT);
  return { uri, width: decode, height: decode, cacheKey: uri };
}

/**
 * Feed and STAR share one expo-image entry. The cache key is the URI, so a
 * thumbnail already decoded in the feed paints from memory/disk with no download.
 */
export function cachedImageSource(
  uri: string,
  decodeWidth?: number
): { uri: string; cacheKey: string; width?: number; height?: number } {
  const source: { uri: string; cacheKey: string; width?: number; height?: number } = {
    uri,
    cacheKey: uri,
  };
  if (decodeWidth && decodeWidth > 0) {
    source.width = decodeWidth;
    source.height = decodeWidth;
  }
  return source;
}

/** Prefetch a small set of upcoming URLs (bounded). */
export function prefetchImageUrls(urls: string[], limit = 6): void {
  const unique = [...new Set(urls.filter(Boolean))].slice(0, limit);
  for (const uri of unique) {
    void Image.prefetch(uri, { cachePolicy: IMAGE_CACHE_POLICY });
  }
}
