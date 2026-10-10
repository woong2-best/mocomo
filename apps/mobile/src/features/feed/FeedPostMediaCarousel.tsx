import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FlatList,
  Image as RNImage,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import type { FeedMedia, FeedPost } from "@/api/feed";
import { LazyFeedVideoPreview } from "@/features/feed/LazyFeedVideoPreview";
import { LockedMediaTile } from "@/components/media/LockedMediaTile";
import type { PaidMediaMonetization } from "@/components/media/paid-media-types";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { cachedImageSource, IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { feedCarouselTileSize, feedMediaFrame } from "@/features/feed/feedMediaAspect";

const ITEM_GAP = 8;

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
  const listRef = useRef<FlatList<VisualItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const multiLayout = useMemo(() => {
    if (items.length < 2) return null;
    const tiles = items.map((item) => {
      const media = resolveMedia(item);
      return feedCarouselTileSize(windowHeight, media.width, media.height, media.type);
    });
    const offsets: number[] = [];
    tiles.forEach((tile, index) => {
      const prev = index === 0 ? 0 : offsets[index - 1]! + tiles[index - 1]!.width + ITEM_GAP;
      offsets.push(prev);
    });
    return { tiles, offsets };
  }, [items, resolveMedia, windowHeight]);

  useEffect(() => {
    let cancelled = false;
    for (const item of items) {
      if (item.width && item.height && item.width > 0 && item.height > 0) continue;
      const uri = item.type === "IMAGE" ? item.url?.trim() : item.posterUrl?.trim();
      if (!uri) continue;
      const key = item.id ?? uri;
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

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsets = multiLayout?.offsets;
      if (!offsets?.length) return;
      const x = e.nativeEvent.contentOffset.x;
      let best = 0;
      let bestDist = Infinity;
      offsets.forEach((offset, index) => {
        const dist = Math.abs(offset - x);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      setActiveIndex(best);
    },
    [multiLayout]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const centered = viewableItems.find((v) => v.isViewable)?.index;
    if (typeof centered === "number") setActiveIndex(centered);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 72,
    minimumViewTime: 80,
  }).current;

  const openMedia = useCallback(
    (item: VisualItem) => {
      onPressVideo?.(post.id, item.id, item.index);
    },
    [onPressVideo, post.id]
  );

  if (items.length === 0) return null;

  const nsfwGate = !!post.isNsfw && !isOwner;

  const wrapGate = (node: ReactNode, style?: object) => (
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

  const renderImageCell = (item: VisualItem, fit: "cover" | "contain" = "cover") => (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={() => openMedia(item)}
      accessibilityRole="button"
      accessibilityLabel={t("m.common.view_photo_full_screen")}
    >
      <Image
        source={cachedImageSource(item.url, decode)}
        style={StyleSheet.absoluteFill}
        contentFit={fit}
        cachePolicy={IMAGE_CACHE_POLICY}
        recyclingKey={item.url}
        transition={0}
        onLoad={(e) => rememberSize(item, e.source?.width, e.source?.height)}
      />
    </Pressable>
  );

  const renderMediaCell = (item: VisualItem, active: boolean) => {
    if (item.locked && item.type === "VIDEO") {
      return (
        <View style={styles.lockedCell}>
          <LockedMediaTile media={item} monetization={monetization} />
        </View>
      );
    }

    if (item.type === "VIDEO") {
      return (
        <LazyFeedVideoPreview
          media={item}
          active={active}
          embedded={items.length > 1}
          contentFit={items.length > 1 ? "contain" : "cover"}
          monetization={monetization}
          onPress={() => openMedia(item)}
        />
      );
    }

    return renderImageCell(item, items.length > 1 ? "contain" : "cover");
  };

  if (items.length === 1) {
    const item = resolveMedia(items[0]!);
    const box = feedMediaFrame(layoutWidth, windowHeight, item.width, item.height, item.type);
    const size = { width: box.width, height: box.height };
    const fit = box.contain ? "contain" : "cover";

    if (item.locked && item.type === "VIDEO") {
      return wrapGate(
        <View style={[styles.singleMedia, styles.lockedCell, size]}>
          <LockedMediaTile media={item} monetization={monetization} />
        </View>
      );
    }

    if (item.type === "VIDEO" && !item.locked) {
      return wrapGate(
        <View style={[styles.singleMedia, size]}>
          <LazyFeedVideoPreview
            media={item}
            active={previewActive}
            embedded
            contentFit={fit}
            monetization={monetization}
            onPress={() => openMedia(item)}
          />
        </View>
      );
    }

    if (item.locked) {
      return wrapGate(
        <View style={[styles.singleMedia, size]}>
          {renderImageCell(item, fit)}
        </View>
      );
    }

    return wrapGate(
      <Pressable
        style={[styles.singleMedia, size]}
        onPress={() => openMedia(item)}
        accessibilityRole="button"
        accessibilityLabel={t("m.common.view_photo_full_screen")}
      >
        <Image
          source={cachedImageSource(item.url, box.width)}
          style={StyleSheet.absoluteFill}
          contentFit={fit}
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={item.url}
          transition={0}
          onLoad={(e) => rememberSize(items[0]!, e.source?.width, e.source?.height)}
        />
      </Pressable>
    );
  }

  return wrapGate(
    <View style={[styles.wrap, { width: layoutWidth }]}>
      <View style={styles.dots} pointerEvents="none">
        {items.map((item, i) => (
          <View
            key={item.id ?? `${post.id}:${i}`}
            style={[styles.dot, i === activeIndex ? styles.dotActive : null]}
          />
        ))}
      </View>

      <FlatList
        ref={listRef}
        data={items}
        horizontal
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id ?? `${post.id}:media:${item.index}`}
        showsHorizontalScrollIndicator={false}
        style={{ height: multiLayout?.tiles[0]?.height ?? 0 }}
        decelerationRate="fast"
        snapToOffsets={multiLayout?.offsets}
        snapToAlignment="start"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => {
          const tile = multiLayout?.tiles[index];
          const offset = multiLayout?.offsets[index] ?? 0;
          const length = (tile?.width ?? 0) + (index < items.length - 1 ? ITEM_GAP : 0);
          return { length, offset, index };
        }}
        renderItem={({ item, index }) => {
          const isActiveSlide = previewActive && index === activeIndex;
          const media = resolveMedia(item);
          const size =
            multiLayout?.tiles[index] ??
            feedCarouselTileSize(windowHeight, media.width, media.height, media.type);

          return (
            <View
              style={[
                styles.slideInner,
                {
                  width: size.width,
                  height: size.height,
                  marginRight: index < items.length - 1 ? ITEM_GAP : 0,
                },
              ]}
            >
              {renderMediaCell(media, isActiveSlide)}
            </View>
          );
        }}
      />
    </View>,
    styles.wrap
  );
}

export const FeedPostMediaCarousel = memo(FeedPostMediaCarouselInner);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: 10 },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 5,
      marginBottom: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textMuted,
      opacity: 0.35,
    },
    dotActive: {
      opacity: 1,
      backgroundColor: colors.cobalt,
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    slideInner: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    singleMedia: {
      alignSelf: "flex-start",
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.muted,
      marginBottom: 10,
    },
    lockedCell: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.muted,
      position: "relative",
      flex: 1,
      width: "100%",
      height: "100%",
    },
  });
}
