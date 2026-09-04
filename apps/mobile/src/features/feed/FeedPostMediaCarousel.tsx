import { memo, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import type { FeedMedia, FeedPost } from "@/api/feed";
import { FeedImageLightbox } from "@/features/feed/FeedImageLightbox";
import { LazyFeedVideoPreview } from "@/features/feed/LazyFeedVideoPreview";
import { LockedMediaTile } from "@/components/media/LockedMediaTile";
import type { PaidMediaMonetization } from "@/components/media/paid-media-types";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const monetization = useMemo(
    () => buildMonetization(post, paymentsEnabled, onPurchaseSuccess),
    [post, paymentsEnabled, onPurchaseSuccess]
  );
  const listRef = useRef<FlatList<VisualItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const items = useMemo(
    () =>
      (post.media ?? [])
        .map((m, index) => ({ ...m, index }))
        .filter(isVisualMedia),
    [post.media]
  );

  const slideWidth = Math.max(120, layoutWidth - EDGE_PEEK * 2);
  const snapInterval = slideWidth + ITEM_GAP;
  const decode = feedMediaDecodeWidth(slideWidth);

  const images = useMemo(
    () =>
      items
        .filter((m) => m.type === "IMAGE")
        .map((m) => ({
          id: m.id?.trim() || `${post.id}:img:${m.index}`,
          url: m.url.trim(),
        })),
    [items, post.id]
  );

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

  const openVideo = useCallback(
    (item: VisualItem) => {
      onPressVideo?.(post.id, item.id, item.index);
    },
    [onPressVideo, post.id]
  );

  const openImage = useCallback(
    (item: VisualItem) => {
      const start = images.findIndex(
        (img) => img.url === item.url.trim() || img.id === item.id
      );
      if (start >= 0) {
        setActiveIndex(item.index);
        setLightboxOpen(true);
      }
    },
    [images]
  );

  if (items.length === 0) return null;

  const nsfwGate = !!post.isNsfw && !isOwner;

  const wrapGate = (node: ReactNode, style?: object) => (
    <SensitiveContentGate enabled={nsfwGate} style={style}>
      {node}
    </SensitiveContentGate>
  );

  const renderImageCell = (item: VisualItem) => (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={() => openImage(item)}
      accessibilityRole="button"
      accessibilityLabel="사진 크게 보기"
    >
      <Image
        source={{ uri: item.url, width: decode, height: decode }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        recyclingKey={item.url}
        transition={0}
      />
    </Pressable>
  );

  const renderMediaCell = (item: VisualItem, active: boolean, aspect: number) => {
    if (item.locked && item.type === "VIDEO") {
      return (
        <View style={[styles.lockedCell, { aspectRatio: aspect }]}>
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
          onPress={() => openVideo(item)}
        />
      );
    }

    return renderImageCell(item);
  };

  if (items.length === 1) {
    const item = items[0]!;
    const aspect =
      item.width && item.height && item.width > 0 && item.height > 0
        ? Math.min(Math.max(item.width / item.height, 0.56), 1.9)
        : 16 / 10;

    if (item.locked && item.type === "VIDEO") {
      return wrapGate(
        <View style={[styles.singleMedia, styles.lockedCell, { width: layoutWidth, aspectRatio: aspect }]}>
          <LockedMediaTile media={item} monetization={monetization} />
        </View>
      );
    }

    if (item.type === "VIDEO" && !item.locked) {
      return wrapGate(
        <LazyFeedVideoPreview
          media={item}
          active={previewActive}
          monetization={monetization}
          onPress={() => openVideo(item)}
        />
      );
    }

    if (item.locked) {
      return (
        <>
          {wrapGate(
            <View style={[styles.singleMedia, { width: layoutWidth, aspectRatio: aspect }]}>
              {renderImageCell(item)}
            </View>
          )}
          <FeedImageLightbox
            visible={lightboxOpen}
            images={images}
            initialIndex={0}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      );
    }

    return (
      <>
        {wrapGate(
          <Pressable
            style={[styles.singleMedia, { width: layoutWidth, aspectRatio: aspect }]}
            onPress={() => openImage(item)}
            accessibilityRole="button"
            accessibilityLabel="사진 크게 보기"
          >
            <Image
              source={{ uri: item.url, width: decode, height: decode }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
              recyclingKey={item.url}
              transition={0}
            />
          </Pressable>
        )}
        <FeedImageLightbox
          visible={lightboxOpen}
          images={images}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      </>
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
          const aspect =
            item.width && item.height && item.width > 0 && item.height > 0
              ? Math.min(Math.max(item.width / item.height, 0.56), 1.9)
              : 16 / 10;

          return (
            <View style={[styles.slide, { width: slideWidth, marginRight: ITEM_GAP }]}>
              <View style={[styles.slideInner, { aspectRatio: aspect }]}>
                {renderMediaCell(item, isActiveSlide, aspect)}
              </View>
            </View>
          );
        }}
      />

      <FeedImageLightbox
        visible={lightboxOpen}
        images={images}
        initialIndex={Math.max(
          0,
          images.findIndex((img) => {
            const current = items[activeIndex];
            return current?.type === "IMAGE" && img.url === current.url.trim();
          })
        )}
        onClose={() => setLightboxOpen(false)}
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
    },
  });
}
