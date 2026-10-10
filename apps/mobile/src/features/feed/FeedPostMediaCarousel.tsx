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
import {
  feedMediaFrame,
  feedMediaFrameHeight,
  isPortraitMedia,
} from "@/features/feed/feedMediaAspect";

const ITEM_GAP = 8;
const EDGE_PEEK = 14;

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
  const [measured, setMeasured] = useState<{ key: string; width: number; height: number } | null>(
    null
  );

  useEffect(() => {
    if (items.length !== 1) return;
    const item = items[0]!;
    if (isPortraitMedia(item.width, item.height)) return;
    const uri = item.type === "IMAGE" ? item.url?.trim() : item.posterUrl?.trim();
    if (!uri) return;
    let cancelled = false;
    RNImage.getSize(
      uri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= width) return;
        setMeasured({ key: item.id ?? uri, width, height });
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [items]);

  const slideWidth = Math.max(120, layoutWidth - EDGE_PEEK * 2);
  const snapInterval = slideWidth + ITEM_GAP;
  const decode = feedMediaDecodeWidth(slideWidth);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / Math.max(snapInterval, 1));
      if (next >= 0 && next < items.length) setActiveIndex(next);
    },
    [items.length, snapInterval]
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

  const rememberPortrait = (item: VisualItem, width?: number, height?: number) => {
    if (!width || !height || height <= width) return;
    const key = item.id ?? item.url;
    setMeasured((prev) =>
      prev?.key === key && prev.width === width && prev.height === height
        ? prev
        : { key, width, height }
    );
  };

  const withMeasured = (item: VisualItem): VisualItem => {
    const key = item.id ?? item.url;
    if (!measured || measured.key !== key || measured.height <= measured.width) return item;
    return { ...item, width: measured.width, height: measured.height };
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
        onLoad={(e) => {
          if (items.length !== 1) return;
          rememberPortrait(item, e.source?.width, e.source?.height);
        }}
      />
    </Pressable>
  );

  const frameSize = (item: VisualItem, width: number) => ({
    width,
    height: feedMediaFrameHeight(width, windowHeight, item.width, item.height, item.type),
  });

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
          monetization={monetization}
          onPress={() => openMedia(item)}
        />
      );
    }

    return renderImageCell(item);
  };

  if (items.length === 1) {
    const item = withMeasured(items[0]!);
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
          onLoad={(e) => rememberPortrait(items[0]!, e.source?.width, e.source?.height)}
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
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: EDGE_PEEK }}
        onMomentumScrollEnd={onScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: snapInterval,
          offset: EDGE_PEEK + snapInterval * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isActiveSlide = previewActive && index === activeIndex;
          const size = frameSize(item, slideWidth);

          return (
            <View style={[styles.slide, { width: slideWidth, marginRight: ITEM_GAP }]}>
              <View style={[styles.slideInner, size]}>
                {renderMediaCell(item, isActiveSlide)}
              </View>
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
    slide: {},
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
