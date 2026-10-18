import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import type { FeedMedia, FeedPost } from "@/api/feed";
import { LazyFeedVideoPreview } from "@/features/feed/LazyFeedVideoPreview";
import { LockedMediaTile } from "@/components/media/LockedMediaTile";
import type { PaidMediaMonetization } from "@/components/media/paid-media-types";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { cachedImageSource, IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { resolveVideoPoster } from "@/lib/video-poster";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import {
  FEED_MEDIA_GRID_RADIUS,
  feedMediaFrame,
  feedMediaGridCellRadii,
  feedMediaGridLayout,
} from "@/features/feed/feedMediaAspect";

type VisualItem = FeedMedia & { index: number };

type Props = {
  post: FeedPost;
  layoutWidth: number;
  previewActive?: boolean;
  isOwner?: boolean;
  paymentsEnabled?: boolean;
  onPurchaseSuccess?: () => void;
  onPressVideo?: (postId: string, mediaId?: string, mediaIndex?: number) => void;
};

function isVisualMedia(m: FeedMedia): boolean {
  if (m.type !== "IMAGE" && m.type !== "VIDEO") return false;
  return Boolean(m.url?.trim()) || Boolean(m.locked);
}

function buildMonetization(
  post: FeedPost,
  paymentsEnabled?: boolean,
  onPurchaseSuccess?: () => void
): PaidMediaMonetization {
  return {
    postId: post.id,
    authorId: post.author.id,
    authorUsername: post.author.username,
    paymentsEnabled: paymentsEnabled ?? post.paymentsEnabled ?? false,
    subscribedToAuthor: post.subscribedToAuthor ?? false,
    subscriptionPriceKrw: post.author.creatorSubscriptionPriceKrw ?? null,
    postInstantPurchasePriceKrw: post.instantPurchasePriceKrw ?? null,
    onPurchaseSuccess,
  };
}

function FeedPostMediaCarouselInner({
  post,
  layoutWidth,
  previewActive = false,
  isOwner = false,
  paymentsEnabled = false,
  onPurchaseSuccess,
  onPressVideo,
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const monetization = useMemo(
    () => buildMonetization(post, paymentsEnabled, onPurchaseSuccess),
    [post, paymentsEnabled, onPurchaseSuccess]
  );

  const items = useMemo(
    () =>
      (post.media ?? [])
        .map((m, index) => ({ ...m, index }))
        .filter(isVisualMedia),
    [post.media]
  );
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});

  const resolveMedia = useCallback(
    (item: VisualItem): VisualItem => {
      const key = item.id ?? item.url;
      const hit = key ? measured[key] : undefined;
      if (!hit || hit.width <= 0 || hit.height <= 0) return item;
      return { ...item, width: hit.width, height: hit.height };
    },
    [measured]
  );

  useEffect(() => {
    let cancelled = false;
    for (const item of items) {
      if (item.width && item.height && item.width > 0 && item.height > 0) continue;
      const uri =
        item.type === "IMAGE"
          ? item.url?.trim()
          : resolveVideoPoster(item) || item.posterUrl?.trim();
      if (!uri) continue;
      const key = item.id ?? item.url ?? uri;
      RNImage.getSize(
        uri,
        (width, height) => {
          if (cancelled || width <= 0 || height <= 0) return;
          setMeasured((prev) =>
            prev[key]?.width === width && prev[key]?.height === height
              ? prev
              : { ...prev, [key]: { width, height } }
          );
        },
        () => {}
      );
    }
    return () => {
      cancelled = true;
    };
  }, [items]);

  const decode = feedMediaDecodeWidth(layoutWidth);

  const openMedia = useCallback(
    (item: VisualItem) => {
      onPressVideo?.(post.id, item.id, item.index);
    },
    [onPressVideo, post.id]
  );

  if (items.length === 0) return null;

  const nsfwGate = !!post.isNsfw && !isOwner;

  const wrapGate = (node: ReactNode, style?: StyleProp<ViewStyle>) => (
    <SensitiveContentGate enabled={nsfwGate} style={style}>
      {node}
    </SensitiveContentGate>
  );

  const rememberSize = (item: VisualItem, width?: number, height?: number) => {
    if (!width || !height || width <= 0 || height <= 0) return;
    const key = item.id ?? item.url;
    if (!key) return;
    setMeasured((prev) =>
      prev[key]?.width === width && prev[key]?.height === height
        ? prev
        : { ...prev, [key]: { width, height } }
    );
  };

  const renderImageCell = (item: VisualItem, imageStyle?: StyleProp<ViewStyle>) => (
    <Pressable
      style={styles.fill}
      onPress={() => openMedia(item)}
      accessibilityRole="button"
      accessibilityLabel={t("m.common.view_photo_full_screen")}
    >
      <Image
        source={cachedImageSource(item.url, decode)}
        style={[styles.fill, imageStyle]}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        recyclingKey={item.url}
        transition={0}
        onLoad={(e) => rememberSize(item, e.source?.width, e.source?.height)}
      />
    </Pressable>
  );

  const renderMediaCell = (item: VisualItem, active: boolean, imageStyle?: StyleProp<ViewStyle>) => {
    if (item.locked && item.type === "VIDEO") {
      return (
        <View style={[styles.lockedCell, imageStyle]}>
          <LockedMediaTile media={item} monetization={monetization} />
        </View>
      );
    }

    if (item.type === "VIDEO") {
      return (
        <LazyFeedVideoPreview
          media={item}
          active={active}
          embedded
          contentFit="cover"
          monetization={monetization}
          onPress={() => openMedia(item)}
          style={imageStyle}
        />
      );
    }

    return renderImageCell(item, imageStyle);
  };

  if (items.length === 1) {
    const item = resolveMedia(items[0]!);
    const box = feedMediaFrame(layoutWidth, windowHeight, item.width, item.height, item.type);
    const size = { width: box.width, height: box.height };

    if (item.locked && item.type === "VIDEO") {
      return wrapGate(
        <View collapsable={false} style={[styles.singleMedia, styles.lockedCell, size]}>
          <LockedMediaTile media={item} monetization={monetization} />
        </View>
      );
    }

    if (item.type === "VIDEO" && !item.locked) {
      return wrapGate(
        <View collapsable={false} style={[styles.singleMedia, size]}>
          <LazyFeedVideoPreview
            media={item}
            active={previewActive}
            embedded
            contentFit="cover"
            monetization={monetization}
            onPress={() => openMedia(item)}
          />
        </View>
      );
    }

    if (item.locked) {
      return wrapGate(
        <View collapsable={false} style={[styles.singleMedia, size]}>
          {renderImageCell(item)}
        </View>
      );
    }

    return wrapGate(
      <Pressable
        collapsable={false}
        style={[styles.singleMedia, size]}
        onPress={() => openMedia(item)}
        accessibilityRole="button"
        accessibilityLabel={t("m.common.view_photo_full_screen")}
      >
        <Image
          source={cachedImageSource(item.url, box.width)}
          style={styles.fill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={item.url}
          transition={0}
          onLoad={(e) => rememberSize(items[0]!, e.source?.width, e.source?.height)}
        />
      </Pressable>
    );
  }

  const grid = feedMediaGridLayout(layoutWidth, windowHeight, items.length);
  const frame = {
    width: grid.width,
    height: grid.height,
    minHeight: grid.height,
  };

  return (
    <SensitiveContentGate
      enabled={nsfwGate}
      style={[styles.gridFrame, frame]}
    >
      <View collapsable={false} style={[styles.gridClip, frame]}>
        {grid.cells.map((cell) => {
          const item = items[cell.index];
          if (!item) return null;
          const media = resolveMedia(item);
          const showMore = grid.overflow > 0 && cell.index === 3;
          const cellRadii = feedMediaGridCellRadii(cell.index, items.length);
          return (
            <View
              key={item.id ?? `${post.id}:media:${item.index}`}
              collapsable={false}
              style={[
                styles.gridCell,
                cellRadii,
                {
                  left: cell.x,
                  top: cell.y,
                  width: cell.width,
                  height: cell.height,
                },
              ]}
            >
              {renderMediaCell(media, false, cellRadii)}
              {showMore ? (
                <View style={styles.moreBadge} pointerEvents="none">
                  <Text style={styles.moreText}>+{grid.overflow}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </SensitiveContentGate>
  );
}

export const FeedPostMediaCarousel = memo(FeedPostMediaCarouselInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    fill: {
      width: "100%",
      height: "100%",
    },
    gridFrame: {
      alignSelf: "flex-start",
      marginBottom: 10,
    },
    gridClip: {
      position: "relative",
      borderRadius: FEED_MEDIA_GRID_RADIUS,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    gridCell: {
      position: "absolute",
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    singleMedia: {
      alignSelf: "flex-start",
      position: "relative",
      borderRadius: FEED_MEDIA_GRID_RADIUS,
      overflow: "hidden",
      backgroundColor: colors.muted,
      marginBottom: 10,
    },
    lockedCell: {
      overflow: "hidden",
      backgroundColor: colors.muted,
      position: "relative",
      flex: 1,
      width: "100%",
      height: "100%",
    },
    moreBadge: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    moreText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  });
}
