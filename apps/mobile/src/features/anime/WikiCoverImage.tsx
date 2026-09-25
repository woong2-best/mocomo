import { useEffect, useState } from "react";
import { Image, type ImageContentFit, type ImageStyle } from "expo-image";
import type { StyleProp } from "react-native";
import { wikiCoverDisplayUrl } from "@/features/anime/wiki-cover-url";
import { IMAGE_CACHE_POLICY } from "@/perf/image";

type Variant = "hero" | "poster";

/**
 * Culture Wiki photos — same source as web, never a downscaled cache of the list tile.
 */
export function WikiCoverImage({
  url,
  style,
  contentFit,
  variant,
  onLoadSize,
  onFailed,
}: {
  url: string;
  style: StyleProp<ImageStyle>;
  contentFit: ImageContentFit;
  variant: Variant;
  onLoadSize?: (width: number, height: number) => void;
  onFailed?: () => void;
}) {
  const preferred = wikiCoverDisplayUrl(url) ?? url;
  const [uri, setUri] = useState(preferred);

  useEffect(() => {
    setUri(wikiCoverDisplayUrl(url) ?? url);
  }, [url]);

  return (
    <Image
      source={{ uri, cacheKey: `wiki-${variant}:${uri}` }}
      style={style}
      contentFit={contentFit}
      cachePolicy={IMAGE_CACHE_POLICY}
      recyclingKey={`wiki-${variant}:${uri}`}
      allowDownscaling={variant !== "hero"}
      priority={variant === "hero" ? "high" : "normal"}
      transition={0}
      onLoad={(e) => {
        const w = e.source?.width;
        const h = e.source?.height;
        if (w && h) onLoadSize?.(w, h);
      }}
      onError={() => {
        if (uri !== url) {
          setUri(url);
          return;
        }
        onFailed?.();
      }}
    />
  );
}
