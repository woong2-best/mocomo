import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { showIslandError, showIslandInfo } from "@/ui/IslandToast";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { ShareGlobeIcon } from "@/ui/ShareGlobeIcon";
import * as Haptics from "expo-haptics";
import { LockedMediaTile } from "@/components/media/LockedMediaTile";
import { isPaidPlaybackPath } from "@/api/watermark";
import { PaidVideoPlayer } from "@/components/media/PaidVideoPlayer";
import { useIsFocused } from "@react-navigation/native";
import type { ReelItem } from "@/api/reels";
import { useQueryClient } from "@tanstack/react-query";
import { togglePostLike, type FeedPost } from "@/api/feed";
import { runOptimisticStarToggle } from "@/api/star-hub-cache";
import type { FeedVideoGroup } from "@/features/feed/feed-video-groups";
import { cachedImageSource, IMAGE_CACHE_POLICY } from "@/perf/image";
import { spacing } from "@/theme/tokens";
import { ReelAuthorMeta } from "@/features/reels/ReelAuthorMeta";
import {
  buildVideoCaptionText,
  CollapsibleVideoCaption,
  collapsibleCaptionStyles,
} from "@/ui/CollapsibleVideoCaption";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { PostReportSheet } from "@/features/feed/PostReportSheet";
import { FeedPostRepostMenu } from "@/features/feed/FeedPostRepostMenu";
import type { MenuAnchor } from "@/features/feed/FeedPostOverflowMenu";
import { useAuth } from "@/auth/AuthContext";
import { useShowLikeCounts } from "@/hooks/use-display-preferences";
import { useI18n } from "@/i18n/I18nProvider";
import { REELS_WIDE_CARD_RADIUS } from "@/features/reels/reels-wide-layout";
import { ReelPinchZoom } from "@/features/reels/ReelPinchZoom";
import { reelFillPhoneScale } from "@/features/reels/reel-pinch-zoom";
import {
  enablePitchPreservingPlayback,
  setPitchPreservingPlaybackRate,
} from "@/lib/video-preserve-pitch";

const FAST_PLAYBACK_RATE = 2;

function reelAsFeedPost(reel: ReelItem, starred: boolean): FeedPost {
  return {
    id: reel.postId,
    title: reel.title,
    content: reel.content,
    postType: reel.mediaType === "IMAGE" ? "PHOTO" : "VIDEO",
    createdAt: reel.createdAt,
    isNsfw: reel.isNsfw,
    viewCount: reel.viewCount,
    author: {
      id: reel.author.id,
      username: reel.author.username,
      name: reel.author.name,
      image: reel.author.image,
    },
    media: [
      {
        id: reel.media.id,
        url: reel.media.url,
        type: reel.mediaType === "IMAGE" ? "IMAGE" : "VIDEO",
        posterUrl: reel.media.posterUrl,
        hlsUrl: reel.media.hlsUrl,
        width: reel.media.width,
        height: reel.media.height,
        duration: reel.media.duration,
        priceKrw: reel.media.priceKrw,
        locked: reel.media.locked,
        lockReason: reel.media.lockReason,
        instantPurchasePriceKrw: reel.media.instantPurchasePriceKrw,
      },
    ],
    _count: { likes: reel.likeCount, comments: reel.commentCount },
    liked: reel.liked,
    starred,
  };
}

type Props = {
  group: FeedVideoGroup;
  width: number;
  height: number;
  /** 9:16 column on wide viewports; defaults to full `width`. */
  stageWidth?: number;
  stageLeft?: number;
  /** This post row is the vertically active one. */
  active: boolean;
  /** Mount native decoder only when near viewport (memory + shake gate). */
  loadPlayer: boolean;
  initialVideoIndex: number;
  onOpenComments: (postId: string, commentCount: number) => void;
  onPrefetchComments?: (postId: string) => void;
  onChangeVideoIndex?: (index: number) => void;
  /** Hide Reels chrome while a still-hold 2× is active. */
  onFastForwardChange?: (active: boolean) => void;
  /** Lock the vertical pager while a two-finger pinch is active. */
  onPinchZoomChange?: (zooming: boolean) => void;
};

function NativeVideoCell({
  item,
  src,
  active,
  playing,
  muted,
  pausedByUser,
  fastForward,
}: {
  item: ReelItem;
  src: string;
  /** Current cell in the active vertical slot (poster + seek-on-scroll-away). */
  active: boolean;
  /** Audible playback — false when Reels is covered (e.g. UserProfile). */
  playing: boolean;
  muted: boolean;
  pausedByUser: boolean;
  fastForward: boolean;
}) {
  const player = useVideoPlayer(src || null, (p) => {
    enablePitchPreservingPlayback(p);
    p.loop = true;
    p.muted = muted;
    p.playbackRate = 1;
  });
  const wasActiveRef = useRef(active);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    setPitchPreservingPlaybackRate(player, fastForward ? FAST_PLAYBACK_RATE : 1);
  }, [fastForward, player]);

  useEffect(() => {
    if (!src) return;
    const becameInactive = wasActiveRef.current && !active;
    wasActiveRef.current = active;

    if (playing && (!pausedByUser || fastForward)) {
      player.play();
    } else {
      player.pause();
      // Seek only when scrolling away — not on screen blur, so return can resume.
      if (becameInactive) {
        try {
          player.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
  }, [active, playing, pausedByUser, fastForward, player, src]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {item.media.posterUrl && !active ? (
        <Image
          source={cachedImageSource(item.media.posterUrl)}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          cachePolicy={IMAGE_CACHE_POLICY}
          transition={0}
        />
      ) : null}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="contain"
        nativeControls={false}
        pointerEvents="none"
      />
    </View>
  );
}

function VideoPoster({ item }: { item: ReelItem }) {
  const imageUri = item.media.posterUrl?.trim() || item.media.url?.trim() || "";
  if (!imageUri) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />;
  }
  return (
    <Image
      source={cachedImageSource(imageUri)}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      cachePolicy={IMAGE_CACHE_POLICY}
      transition={0}
    />
  );
}

function VideoCell({
  item,
  active,
  playing,
  muted,
  pausedByUser,
  fastForward,
  loadPlayer,
}: {
  item: ReelItem;
  active: boolean;
  playing: boolean;
  muted: boolean;
  pausedByUser: boolean;
  fastForward: boolean;
  loadPlayer: boolean;
}) {
  const src = useMemo(() => {
    const progressive = item.media.url?.trim();
    const hls = item.media.hlsUrl?.trim();
    if (progressive && !progressive.includes(".m3u8")) return progressive;
    return hls || progressive || "";
  }, [item.media.hlsUrl, item.media.url]);

  const isPaid = isPaidPlaybackPath(src) || (item.media.priceKrw ?? 0) > 0;
  const mediaId = item.media.id?.trim() || null;
  const locked = Boolean(item.media.locked);
  const isImage = item.mediaType === "IMAGE";

  if (isImage) {
    const imageUri = item.media.url?.trim() || item.media.posterUrl?.trim() || "";
    if (locked && item.monetization) {
      return (
        <View style={StyleSheet.absoluteFill}>
          <LockedMediaTile
            media={{
              id: mediaId ?? undefined,
              url: item.media.url,
              type: "IMAGE",
              priceKrw: item.media.priceKrw,
              locked: true,
              lockReason: item.media.lockReason,
              instantPurchasePriceKrw: item.media.instantPurchasePriceKrw,
            }}
            monetization={item.monetization}
          />
        </View>
      );
    }
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
        {imageUri ? (
          <Image
            source={cachedImageSource(imageUri)}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy={IMAGE_CACHE_POLICY}
          />
        ) : null}
      </View>
    );
  }

  if (locked && item.monetization) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LockedMediaTile
          media={{
            id: mediaId ?? undefined,
            url: item.media.url,
            type: "VIDEO",
            priceKrw: item.media.priceKrw,
            locked: true,
            lockReason: item.media.lockReason,
            instantPurchasePriceKrw: item.media.instantPurchasePriceKrw,
          }}
          monetization={item.monetization}
        />
      </View>
    );
  }

  if (!src) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />;
  }

  if (!loadPlayer) {
    return <VideoPoster item={item} />;
  }

  if (isPaid && mediaId) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {item.media.posterUrl && !active ? (
          <Image
            source={cachedImageSource(item.media.posterUrl)}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy={IMAGE_CACHE_POLICY}
          />
        ) : null}
        <PaidVideoPlayer
          media={{
            id: mediaId,
            url: item.media.url,
            type: "VIDEO",
            priceKrw: item.media.priceKrw,
            locked: item.media.locked,
            lockReason: item.media.lockReason,
            instantPurchasePriceKrw: item.media.instantPurchasePriceKrw,
          }}
          active={playing && (!pausedByUser || fastForward)}
          muted={false}
          contentFit="contain"
          monetization={item.monetization}
        />
      </View>
    );
  }

  return (
    <NativeVideoCell
      item={item}
      src={src}
      active={active}
      playing={playing}
      muted={muted}
      pausedByUser={pausedByUser}
      fastForward={fastForward}
    />
  );
}

function FeedVideoPostSlideInner({
  group,
  width,
  height,
  stageWidth: stageWidthProp,
  stageLeft: stageLeftProp,
  active,
  loadPlayer,
  initialVideoIndex,
  onOpenComments,
  onPrefetchComments,
  onChangeVideoIndex,
  onFastForwardChange,
  onPinchZoomChange,
}: Props) {
  const stageWidth = stageWidthProp ?? width;
  const stageLeft = stageLeftProp ?? 0;
  const isWide = stageLeft > 0 || stageWidth < width;
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const starLock = useRef(false);
  const postIdRef = useRef(group.postId);
  postIdRef.current = group.postId;
  const isFocused = useIsFocused();
  const { user, status } = useAuth();
  const showLikeCounts = useShowLikeCounts();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const [videoIndex, setVideoIndex] = useState(
    Math.min(Math.max(initialVideoIndex, 0), Math.max(group.videos.length - 1, 0))
  );
  const [liked, setLiked] = useState(!!group.videos[0]?.liked);
  const [likeCount, setLikeCount] = useState(group.videos[0]?.likeCount ?? 0);
  const [starred, setStarred] = useState(!!group.videos[0]?.starred);
  const [reposted, setReposted] = useState(!!group.videos[0]?.reposted);
  const [repostCount, setRepostCount] = useState(group.videos[0]?.repostCount ?? 0);
  const [repostBusy, setRepostBusy] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [repostMenuAnchor, setRepostMenuAnchor] = useState<MenuAnchor | null>(null);
  const repostAnchorRef = useRef<View>(null);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [fastForward, setFastForward] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pinchZooming, setPinchZooming] = useState(false);

  const current = group.videos[videoIndex] ?? group.videos[0];
  const captionText = useMemo(
    () => buildVideoCaptionText(current?.title, current?.content ?? ""),
    [current?.content, current?.title]
  );
  const chromeHidden = fastForward || pinchZooming;

  const stopFastForward = useCallback(() => {
    setFastForward((prev) => {
      if (prev) onFastForwardChange?.(false);
      return false;
    });
  }, [onFastForwardChange]);

  const handlePinchZoomChange = useCallback(
    (next: boolean) => {
      setPinchZooming(next);
      if (next) stopFastForward();
      onPinchZoomChange?.(next);
    },
    [onPinchZoomChange, stopFastForward]
  );

  const startFastForward = useCallback(() => {
    if (!active || !isFocused || pausedByUser) return;
    setFastForward(true);
    onFastForwardChange?.(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [active, isFocused, onFastForwardChange, pausedByUser]);

  useEffect(() => {
    if (!active || !isFocused) stopFastForward();
  }, [active, isFocused, stopFastForward]);

  useEffect(() => {
    stopFastForward();
    setCaptionExpanded(false);
  }, [videoIndex, group.postId, stopFastForward]);

  useEffect(() => {
    return () => {
      onFastForwardChange?.(false);
    };
  }, [onFastForwardChange]);

  useEffect(() => {
    const idx = Math.min(Math.max(initialVideoIndex, 0), Math.max(group.videos.length - 1, 0));
    setVideoIndex(idx);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false });
    });
  }, [group.postId, initialVideoIndex, group.videos.length]);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: videoIndex, animated: false });
    });
  }, [stageWidth]);

  useEffect(() => {
    starLock.current = false;
  }, [group.postId]);

  useEffect(() => {
    if (!current) return;
    setLiked(!!current.liked);
    setLikeCount(current.likeCount);
    setStarred(!!current.starred);
    setReposted(!!current.reposted);
    setRepostCount(current.repostCount ?? 0);
  }, [
    current?.id,
    current?.liked,
    current?.likeCount,
    current?.starred,
    current?.reposted,
    current?.repostCount,
  ]);

  useEffect(() => {
    if (!active) setPausedByUser(false);
  }, [active]);

  useEffect(() => {
    if (active) return;
    setPinchZooming(false);
    onPinchZoomChange?.(false);
  }, [active, onPinchZoomChange]);

  useEffect(() => {
    setPinchZooming(false);
    onPinchZoomChange?.(false);
  }, [videoIndex, group.postId, onPinchZoomChange]);

  useEffect(() => {
    setPausedByUser(false);
  }, [videoIndex, group.postId]);

  const togglePause = useCallback(() => {
    if (!active) return;
    setPausedByUser((p) => !p);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [active]);

  const onHScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.max(stageWidth, 1);
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / page);
      const target = Math.max(0, Math.min(group.videos.length - 1, next)) * page;
      if (Math.abs(x - target) > 1.5) {
        listRef.current?.scrollToOffset({ offset: target, animated: true });
      }
      if (next !== videoIndex && next >= 0 && next < group.videos.length) {
        setVideoIndex(next);
        onChangeVideoIndex?.(next);
      }
    },
    [group.videos.length, onChangeVideoIndex, stageWidth, videoIndex]
  );

  const onLike = useCallback(() => {
    if (!current) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void togglePostLike(current.postId)
      .then((res) => {
        setLiked(res.liked);
        setLikeCount(res.likeCount);
      })
      .catch(() => {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      });
  }, [current, likeCount, liked]);

  const onStar = useCallback(() => {
    if (!current || starLock.current) return;
    const postId = current.postId;
    const prev = starred;
    const next = !prev;
    starLock.current = true;
    setStarred(next);
    void runOptimisticStarToggle(queryClient, reelAsFeedPost(current, next), next)
      .then((res) => {
        if (postIdRef.current === postId) setStarred(res.starred);
      })
      .catch(() => {
        if (postIdRef.current === postId) setStarred(prev);
      })
      .finally(() => {
        starLock.current = false;
      });
  }, [current, queryClient, starred]);

  const requireLogin = useCallback(() => {
    if (status !== "signedIn") {
      showIslandError(t("m.common.sign_in_required"), t("m.feed.sign_in_to_use_this_feature"));
      return false;
    }
    return true;
  }, [status, t]);

  const openRepostMenu = useCallback(() => {
    if (!requireLogin()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    repostAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setRepostMenuAnchor({ x, y, width, height });
      setRepostMenuOpen(true);
    });
  }, [requireLogin]);

  const onRepostChange = useCallback((nextReposted: boolean, nextCount: number) => {
    setReposted(nextReposted);
    setRepostCount(nextCount);
  }, []);

  const onShare = useCallback(() => {
    if (!current) return;
    void Share.share({
      message: `https://mocomo.net/post/${current.postId}`,
      url: `https://mocomo.net/post/${current.postId}`,
    });
  }, [current]);


  const onReportPress = useCallback(() => {
    if (!user) {
      showIslandError(t("m.common.sign_in_required"), t("m.feed.sign_in_to_report"));
      return;
    }
    if (user.id === current?.author.id) {
      showIslandInfo(t("m.common.notice"), t("m.feed.you_can_t_report_your_own"));
      return;
    }
    setReportOpen(true);
  }, [current?.author.id, t, user]);

  if (!current) {
    return <View style={{ width, height, backgroundColor: "#000" }} />;
  }

  return (
    <View style={{ width, height, backgroundColor: "#000", overflow: "hidden" }}>
      <View
        style={{
          position: "absolute",
          left: stageLeft,
          width: stageWidth,
          height,
          overflow: pinchZooming ? "visible" : "hidden",
          borderRadius: pinchZooming ? 0 : isWide ? REELS_WIDE_CARD_RADIUS : 0,
          zIndex: pinchZooming ? 12 : 0,
        }}
      >
      <FlatList
        ref={listRef}
        data={group.videos}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={Platform.OS === "ios"}
        snapToInterval={Platform.OS === "android" ? stageWidth : undefined}
        snapToAlignment={Platform.OS === "android" ? "start" : undefined}
        disableIntervalMomentum
        nestedScrollEnabled
        directionalLockEnabled
        removeClippedSubviews={false}
        scrollEnabled={active && !pinchZooming && !fastForward}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        onMomentumScrollEnd={onHScroll}
        extraData={`${videoIndex}:${active ? 1 : 0}:${loadPlayer ? 1 : 0}:${isFocused ? 1 : 0}:${pausedByUser ? 1 : 0}:${fastForward ? 1 : 0}:${pinchZooming ? 1 : 0}`}
        getItemLayout={(_, index) => ({
          length: stageWidth,
          offset: stageWidth * index,
          index,
        })}
        initialScrollIndex={Math.min(initialVideoIndex, group.videos.length - 1)}
        onScrollToIndexFailed={() => {
          // ignore cold layout race
        }}
        renderItem={({ item, index }) => {
          const isCurrent = active && index === videoIndex;
          const isPlaying = isCurrent && isFocused;
          return (
            <View
              style={{
                width: stageWidth,
                height,
                overflow: pinchZooming && isCurrent ? "visible" : "hidden",
                zIndex: pinchZooming && isCurrent ? 12 : 0,
              }}
            >
              <ReelPinchZoom
                enabled={isCurrent}
                tapEnabled={isCurrent && item.mediaType !== "IMAGE"}
                holdEnabled={isCurrent && item.mediaType !== "IMAGE" && !pausedByUser}
                onTap={togglePause}
                onHoldStart={startFastForward}
                onHoldEnd={stopFastForward}
                resetKey={`${item.id}:${isCurrent ? 1 : 0}`}
                fillBoost={reelFillPhoneScale(
                  item.media.width ?? 0,
                  item.media.height ?? 0,
                  stageWidth,
                  height,
                  width,
                  height
                )}
                onZoomChange={isCurrent ? handlePinchZoomChange : undefined}
                overlay={
                  isCurrent && pausedByUser && !fastForward && item.mediaType !== "IMAGE" ? (
                    <View style={styles.pauseBadge} pointerEvents="none">
                      <Ionicons name="play" size={56} color="rgba(255,255,255,0.9)" />
                    </View>
                  ) : null
                }
              >
                <SensitiveContentGate
                  enabled={!!item.isNsfw && user?.id !== item.author.id}
                  style={StyleSheet.absoluteFill}
                >
                  <VideoCell
                    item={item}
                    active={isCurrent}
                    playing={isPlaying}
                    muted={false}
                    pausedByUser={pausedByUser}
                    fastForward={isPlaying && fastForward}
                    loadPlayer={loadPlayer && Math.abs(index - videoIndex) <= 1}
                  />
                </SensitiveContentGate>
              </ReelPinchZoom>
            </View>
          );
        }}
      />

      {/* Top segments */}
      {!chromeHidden && group.videos.length > 1 ? (
        <View style={styles.segments} pointerEvents="none">
          {group.videos.map((v, i) => (
            <View
              key={v.id}
              style={[styles.segment, i === videoIndex ? styles.segmentActive : null]}
            />
          ))}
        </View>
      ) : null}

      {!chromeHidden && captionExpanded ? (
        <Pressable
          style={collapsibleCaptionStyles.expandedBackdrop}
          onPress={() => setCaptionExpanded(false)}
          accessibilityRole="button"
          accessibilityLabel={t("m.feed.close_caption")}
        />
      ) : null}

      {/* Bottom meta — stays on the 9:16 stage */}
      {!chromeHidden ? (
        <View
          style={[
            styles.meta,
            isWide ? styles.metaWide : null,
            captionExpanded && collapsibleCaptionStyles.expandedMeta,
          ]}
          pointerEvents="box-none"
        >
        <ReelAuthorMeta
          author={current.author}
          collaborators={current.collaborators}
        />
        {captionText ? (
          <CollapsibleVideoCaption
            text={captionText}
            style={styles.caption}
            resetKey={`${group.postId}:${current.id}`}
            onExpandedChange={setCaptionExpanded}
          />
        ) : null}
        </View>
      ) : null}

      {/* Action rail sits on the video's right edge (Instagram), not the fold gutter. */}
      {!chromeHidden ? (
        <View style={styles.rail} pointerEvents="box-none">
        <Pressable onPress={onLike} style={styles.railBtn} hitSlop={10}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={28}
            color={liked ? "#FF3B5C" : "#fff"}
          />
          {showLikeCounts ? <Text style={styles.railCount}>{likeCount}</Text> : null}
        </Pressable>
        <Pressable
          onPressIn={() => onPrefetchComments?.(current.postId)}
          onPress={() => onOpenComments(current.postId, current.commentCount)}
          style={styles.railBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("m.feed.comments")}
        >
          <Ionicons name="chatbox-outline" size={26} color="#fff" />
          <Text style={styles.railCount}>{current.commentCount}</Text>
        </Pressable>
        <Pressable
          onPress={onStar}
          style={styles.railBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={starred ? t("m.feed.unsave") : t("m.common.save")}
        >
          <Ionicons name={starred ? "star" : "star-outline"} size={26} color="#fff" />
        </Pressable>
        <Pressable
          onPress={onShare}
          style={styles.railBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("m.feed.share")}
        >
          <ShareGlobeIcon size={26} color="#fff" />
        </Pressable>
        <View ref={repostAnchorRef} collapsable={false}>
          <Pressable
            onPress={openRepostMenu}
            style={styles.railBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={reposted ? t("m.feed.undo_repost") : t("m.feed.repost")}
          >
            <Ionicons
              name="repeat-outline"
              size={26}
              color={reposted ? "#8EBEFF" : "#fff"}
            />
          </Pressable>
        </View>
        <Pressable
          onPress={onReportPress}
          style={styles.railBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("post.menu.report")}
        >
          <Ionicons name="flag-outline" size={24} color="#fff" />
        </Pressable>
        </View>
      ) : null}
      </View>

      <PostReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={current.postId}
        authorId={current.author.id}
      />
      <FeedPostRepostMenu
        visible={repostMenuOpen}
        anchor={repostMenuAnchor}
        onClose={() => {
          setRepostMenuOpen(false);
          setRepostMenuAnchor(null);
        }}
        postId={current.postId}
        authorUsername={current.author.username}
        title={current.title}
        content={current.content}
        reposted={reposted}
        repostCount={repostCount}
        busy={repostBusy}
        onBusyChange={setRepostBusy}
        onRepostChange={onRepostChange}
        requireLogin={requireLogin}
      />
    </View>
  );
}

function slideEqual(a: Props, b: Props) {
  return (
    a.group.postId === b.group.postId &&
    a.active === b.active &&
    a.loadPlayer === b.loadPlayer &&
    a.width === b.width &&
    a.height === b.height &&
    a.stageWidth === b.stageWidth &&
    a.stageLeft === b.stageLeft &&
    a.initialVideoIndex === b.initialVideoIndex &&
    a.group.videos.length === b.group.videos.length
  );
}

export const FeedVideoPostSlide = memo(FeedVideoPostSlideInner, slideEqual);

const styles = StyleSheet.create({
  segments: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
    zIndex: 5,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  segmentActive: { backgroundColor: "#fff" },
  pauseBadge: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  rail: {
    position: "absolute",
    right: 10,
    bottom: 120,
    alignItems: "center",
    gap: 18,
    zIndex: 5,
  },
  railBtn: { alignItems: "center" },
  railCount: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 2 },
  meta: {
    position: "absolute",
    left: spacing.md,
    right: 72,
    bottom: 28,
    zIndex: 5,
  },
  metaWide: {
    right: spacing.md,
  },
  caption: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
});
