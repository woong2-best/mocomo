import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import { FolkAvatar } from "@/ui/FolkAvatar";
import {
  buildVideoCaptionText,
  CollapsibleVideoCaption,
  collapsibleCaptionStyles,
} from "@/ui/CollapsibleVideoCaption";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { PostReportSheet } from "@/features/feed/PostReportSheet";
import { useAuth } from "@/auth/AuthContext";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { useShowLikeCounts } from "@/hooks/use-display-preferences";

/** Instagram Reels-style edge hold width — narrow so center taps / right rail stay safe. */
const EDGE_HOLD_WIDTH = 52;
/** Right inset for center tap zone so it does not compete with the action rail. */
const RAIL_CLEARANCE = 76;
const FAST_PLAYBACK_RATE = 2;

function reelAsFeedPost(reel: ReelItem, starred: boolean): FeedPost {
  return {
    id: reel.postId,
    title: reel.title,
    content: reel.content,
    postType: "VIDEO",
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
        type: "VIDEO",
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
  /** This post row is the vertically active one. */
  active: boolean;
  initialVideoIndex: number;
  onOpenComments: (postId: string, commentCount: number) => void;
  onPrefetchComments?: (postId: string) => void;
  onChangeVideoIndex?: (index: number) => void;
  /** Hide Reels chrome (header / nav arrows) while edge-hold 2× is active. */
  onFastForwardChange?: (active: boolean) => void;
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
    p.loop = true;
    p.muted = muted;
    p.playbackRate = 1;
  });
  const wasActiveRef = useRef(active);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    player.playbackRate = fastForward ? FAST_PLAYBACK_RATE : 1;
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
        />
      ) : null}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

function VideoCell({
  item,
  active,
  playing,
  muted,
  pausedByUser,
  fastForward,
}: {
  item: ReelItem;
  active: boolean;
  playing: boolean;
  muted: boolean;
  pausedByUser: boolean;
  fastForward: boolean;
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
          muted={muted}
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

function EdgeHoldZone({
  side,
  disabled,
  onHoldStart,
  onHoldEnd,
}: {
  side: "left" | "right";
  disabled?: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  const holdingRef = useRef(false);

  const endHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    onHoldEnd();
  }, [onHoldEnd]);

  const startHold = useCallback(() => {
    if (disabled || holdingRef.current) return;
    holdingRef.current = true;
    onHoldStart();
  }, [disabled, onHoldStart]);

  return (
    <Pressable
      style={[styles.edgeZone, side === "left" ? styles.edgeLeft : styles.edgeRight]}
      onLongPress={startHold}
      onPressOut={endHold}
      delayLongPress={160}
      accessibilityRole="button"
      accessibilityLabel={side === "left" ? "왼쪽 가장자리 길게 눌러 2배속" : "오른쪽 가장자리 길게 눌러 2배속"}
    />
  );
}

function FeedVideoPostSlideInner({
  group,
  width,
  height,
  active,
  initialVideoIndex,
  onOpenComments,
  onPrefetchComments,
  onChangeVideoIndex,
  onFastForwardChange,
}: Props) {
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();
  const queryClient = useQueryClient();
  const starLock = useRef(false);
  const postIdRef = useRef(group.postId);
  postIdRef.current = group.postId;
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const showLikeCounts = useShowLikeCounts();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const [videoIndex, setVideoIndex] = useState(
    Math.min(Math.max(initialVideoIndex, 0), Math.max(group.videos.length - 1, 0))
  );
  const [liked, setLiked] = useState(!!group.videos[0]?.liked);
  const [likeCount, setLikeCount] = useState(group.videos[0]?.likeCount ?? 0);
  const [starred, setStarred] = useState(!!group.videos[0]?.starred);
  const [muted, setMuted] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [fastForward, setFastForward] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const current = group.videos[videoIndex] ?? group.videos[0];
  const captionText = useMemo(
    () => buildVideoCaptionText(current?.title, current?.content ?? ""),
    [current?.content, current?.title]
  );
  const chromeHidden = fastForward;

  const stopFastForward = useCallback(() => {
    setFastForward((prev) => {
      if (prev) onFastForwardChange?.(false);
      return false;
    });
  }, [onFastForwardChange]);

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
    starLock.current = false;
  }, [group.postId]);

  useEffect(() => {
    if (!current) return;
    setLiked(!!current.liked);
    setLikeCount(current.likeCount);
    setStarred(!!current.starred);
  }, [current?.id, current?.liked, current?.likeCount, current?.starred]);

  useEffect(() => {
    if (!active) setPausedByUser(false);
  }, [active]);

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
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / Math.max(width, 1));
      if (next !== videoIndex && next >= 0 && next < group.videos.length) {
        setVideoIndex(next);
        onChangeVideoIndex?.(next);
      }
    },
    [group.videos.length, onChangeVideoIndex, videoIndex, width]
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

  const onShare = useCallback(() => {
    if (!current) return;
    void Share.share({
      message: `https://mocomo.net/post/${current.postId}`,
      url: `https://mocomo.net/post/${current.postId}`,
    });
  }, [current]);

  const onAuthorPressIn = useCallback(() => {
    if (!current) return;
    prefetchUserProfile({
      username: current.author.username,
      name: current.author.name,
      image: current.author.image,
    });
  }, [current, prefetchUserProfile]);

  const onAuthorPress = useCallback(() => {
    if (!current) return;
    openUserProfile({
      username: current.author.username,
      name: current.author.name,
      image: current.author.image,
    });
  }, [current, openUserProfile]);

  const onReportPress = useCallback(() => {
    if (!user) {
      showIslandError("로그인 필요", "신고하려면 로그인해 주세요.");
      return;
    }
    if (user.id === current?.author.id) {
      showIslandInfo("알림", "자신의 게시물은 신고할 수 없습니다.");
      return;
    }
    setReportOpen(true);
  }, [current?.author.id, user]);

  if (!current) {
    return <View style={{ width, height, backgroundColor: "#000" }} />;
  }

  return (
    <View style={{ width, height, backgroundColor: "#000" }}>
      <FlatList
        ref={listRef}
        data={group.videos}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={onHScroll}
        extraData={`${videoIndex}:${active ? 1 : 0}:${isFocused ? 1 : 0}:${pausedByUser ? 1 : 0}:${muted ? 1 : 0}:${fastForward ? 1 : 0}`}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialScrollIndex={Math.min(initialVideoIndex, group.videos.length - 1)}
        onScrollToIndexFailed={() => {
          // ignore cold layout race
        }}
        renderItem={({ item, index }) => {
          const isCurrent = active && index === videoIndex;
          const isPlaying = isCurrent && isFocused;
          return (
            <View style={{ width, height }}>
              <SensitiveContentGate
                enabled={!!item.isNsfw && user?.id !== item.author.id}
                style={{ flex: 1 }}
              >
                <VideoCell
                  item={item}
                  active={isCurrent}
                  playing={isPlaying}
                  muted={muted}
                  pausedByUser={pausedByUser}
                  fastForward={isPlaying && fastForward}
                />
              </SensitiveContentGate>
              {isCurrent && !chromeHidden ? (
                <>
                  <Pressable
                    style={styles.tapZone}
                    onPress={togglePause}
                    accessibilityRole="button"
                    accessibilityLabel={pausedByUser ? "재생" : "일시정지"}
                  />
                  {pausedByUser ? (
                    <View style={styles.pauseBadge} pointerEvents="none">
                      <Ionicons name="play" size={56} color="rgba(255,255,255,0.9)" />
                    </View>
                  ) : null}
                  <EdgeHoldZone
                    side="left"
                    disabled={pausedByUser}
                    onHoldStart={startFastForward}
                    onHoldEnd={stopFastForward}
                  />
                  <EdgeHoldZone
                    side="right"
                    disabled={pausedByUser}
                    onHoldStart={startFastForward}
                    onHoldEnd={stopFastForward}
                  />
                </>
              ) : null}
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

      {/* Right rail */}
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
          accessibilityLabel="댓글"
        >
          <Ionicons name="chatbox-outline" size={26} color="#fff" />
          <Text style={styles.railCount}>{current.commentCount}</Text>
        </Pressable>
        <Pressable
          onPress={onStar}
          style={styles.railBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={starred ? "저장 취소" : "저장"}
        >
          <Ionicons name={starred ? "star" : "star-outline"} size={26} color="#fff" />
        </Pressable>
        <Pressable
          onPress={onShare}
          style={styles.railBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="공유"
        >
          <ShareGlobeIcon size={26} color="#fff" />
        </Pressable>
        <Pressable onPress={() => setMuted((m) => !m)} style={styles.railBtn} hitSlop={10}>
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={26} color="#fff" />
        </Pressable>
        <Pressable
          onPress={onReportPress}
          style={styles.railBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="신고"
        >
          <Ionicons name="flag-outline" size={24} color="#fff" />
        </Pressable>
        </View>
      ) : null}

      {!chromeHidden && captionExpanded ? (
        <Pressable
          style={collapsibleCaptionStyles.expandedBackdrop}
          onPress={() => setCaptionExpanded(false)}
          accessibilityRole="button"
          accessibilityLabel="설명 닫기"
        />
      ) : null}

      {/* Bottom meta */}
      {!chromeHidden ? (
        <View
          style={[styles.meta, captionExpanded && collapsibleCaptionStyles.expandedMeta]}
          pointerEvents="box-none"
        >
        <Pressable
          onPressIn={onAuthorPressIn}
          onPress={onAuthorPress}
          style={styles.authorRow}
          accessibilityRole="button"
          accessibilityLabel={`${current.author.username} 프로필`}
        >
          <FolkAvatar
            uri={current.author.image}
            name={current.author.name ?? current.author.username}
            size={36}
            framed={false}
            style={styles.metaAvatar}
          />
          <Text style={styles.user}>@{current.author.username}</Text>
        </Pressable>
        {captionText ? (
          <CollapsibleVideoCaption
            text={captionText}
            style={styles.caption}
            resetKey={`${group.postId}:${current.id}`}
            onExpandedChange={setCaptionExpanded}
          />
        ) : null}
        {group.videos.length > 1 ? (
          <Text style={styles.index}>
            {videoIndex + 1} / {group.videos.length}
          </Text>
        ) : null}
        </View>
      ) : null}

      <PostReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={current.postId}
        authorId={current.author.id}
      />

      {fastForward ? (
        <Pressable
          style={styles.releaseCatcher}
          onPressOut={stopFastForward}
          accessibilityLabel="2배속 해제"
        />
      ) : null}
    </View>
  );
}

function slideEqual(a: Props, b: Props) {
  return (
    a.group.postId === b.group.postId &&
    a.active === b.active &&
    a.width === b.width &&
    a.height === b.height &&
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
  tapZone: {
    position: "absolute",
    left: EDGE_HOLD_WIDTH,
    right: RAIL_CLEARANCE,
    top: 32,
    bottom: 88,
    zIndex: 2,
  },
  edgeZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: EDGE_HOLD_WIDTH,
    zIndex: 4,
  },
  edgeLeft: { left: 0 },
  edgeRight: { right: 0 },
  releaseCatcher: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
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
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  metaAvatar: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  user: { color: "#fff", fontWeight: "800", fontSize: 16 },
  caption: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
  index: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", marginTop: 6 },
});
