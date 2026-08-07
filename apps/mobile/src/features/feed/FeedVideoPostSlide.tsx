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
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ReelItem } from "@/api/reels";
import { togglePostLike } from "@/api/feed";
import { togglePostStar } from "@/api/social";
import type { FeedVideoGroup } from "@/features/feed/feed-video-groups";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { spacing } from "@/theme/tokens";

type Props = {
  group: FeedVideoGroup;
  width: number;
  height: number;
  /** This post row is the vertically active one. */
  active: boolean;
  initialVideoIndex: number;
  onOpenComments: (postId: string, commentCount: number) => void;
  onChangeVideoIndex?: (index: number) => void;
};

function VideoCell({
  item,
  active,
  muted,
}: {
  item: ReelItem;
  active: boolean;
  muted: boolean;
}) {
  const src = useMemo(() => {
    const progressive = item.media.url?.trim();
    const hls = item.media.hlsUrl?.trim();
    if (progressive && !progressive.includes(".m3u8")) return progressive;
    return hls || progressive || "";
  }, [item.media.hlsUrl, item.media.url]);

  const player = useVideoPlayer(src || null, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (!src) return;
    if (active) {
      player.play();
    } else {
      player.pause();
      try {
        player.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [active, player, src]);

  if (!src) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {item.media.posterUrl && !active ? (
        <Image
          source={{ uri: item.media.posterUrl }}
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

function FeedVideoPostSlideInner({
  group,
  width,
  height,
  active,
  initialVideoIndex,
  onOpenComments,
  onChangeVideoIndex,
}: Props) {
  const listRef = useRef<FlatList<ReelItem>>(null);
  const [videoIndex, setVideoIndex] = useState(
    Math.min(Math.max(initialVideoIndex, 0), Math.max(group.videos.length - 1, 0))
  );
  const [liked, setLiked] = useState(!!group.videos[0]?.liked);
  const [likeCount, setLikeCount] = useState(group.videos[0]?.likeCount ?? 0);
  const [starred, setStarred] = useState(!!group.videos[0]?.starred);
  const [muted, setMuted] = useState(false);

  const current = group.videos[videoIndex] ?? group.videos[0];

  useEffect(() => {
    const idx = Math.min(Math.max(initialVideoIndex, 0), Math.max(group.videos.length - 1, 0));
    setVideoIndex(idx);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false });
    });
  }, [group.postId, initialVideoIndex, group.videos.length]);

  useEffect(() => {
    if (!current) return;
    setLiked(!!current.liked);
    setLikeCount(current.likeCount);
    setStarred(!!current.starred);
  }, [current?.id, current?.liked, current?.likeCount, current?.starred]);

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
    if (!current) return;
    const prev = starred;
    setStarred(!prev);
    void togglePostStar(current.postId)
      .then((res) => setStarred(res.starred))
      .catch(() => setStarred(prev));
  }, [current, starred]);

  const onShare = useCallback(() => {
    if (!current) return;
    void Share.share({
      message: `https://mocomo.net/post/${current.postId}`,
      url: `https://mocomo.net/post/${current.postId}`,
    });
  }, [current]);

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
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialScrollIndex={Math.min(initialVideoIndex, group.videos.length - 1)}
        onScrollToIndexFailed={() => {
          // ignore cold layout race
        }}
        renderItem={({ item, index }) => (
          <View style={{ width, height }}>
            <VideoCell item={item} active={active && index === videoIndex} muted={muted} />
          </View>
        )}
      />

      {/* Top segments */}
      {group.videos.length > 1 ? (
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
      <View style={styles.rail} pointerEvents="box-none">
        <Pressable onPress={onLike} style={styles.railBtn} hitSlop={10}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={28}
            color={liked ? "#FF3B5C" : "#fff"}
          />
          <Text style={styles.railCount}>{likeCount}</Text>
        </Pressable>
        <Pressable
          onPress={() => onOpenComments(current.postId, current.commentCount)}
          style={styles.railBtn}
          hitSlop={10}
        >
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          <Text style={styles.railCount}>{current.commentCount}</Text>
        </Pressable>
        <Pressable onPress={onStar} style={styles.railBtn} hitSlop={10}>
          <Ionicons name={starred ? "star" : "star-outline"} size={26} color="#fff" />
          <Text style={styles.railLabel}>저장</Text>
        </Pressable>
        <Pressable onPress={onShare} style={styles.railBtn} hitSlop={10}>
          <Ionicons name="share-outline" size={26} color="#fff" />
          <Text style={styles.railLabel}>공유</Text>
        </Pressable>
        <Pressable onPress={() => setMuted((m) => !m)} style={styles.railBtn} hitSlop={10}>
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={26} color="#fff" />
        </Pressable>
      </View>

      {/* Bottom meta */}
      <View style={styles.meta} pointerEvents="none">
        <Text style={styles.user}>@{current.author.username}</Text>
        {current.content ? (
          <Text style={styles.caption} numberOfLines={2}>
            {current.content}
          </Text>
        ) : null}
        {group.videos.length > 1 ? (
          <Text style={styles.index}>
            {videoIndex + 1} / {group.videos.length}
          </Text>
        ) : null}
      </View>
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
  railLabel: { color: "#fff", fontSize: 11, fontWeight: "700", marginTop: 2 },
  meta: {
    position: "absolute",
    left: spacing.md,
    right: 72,
    bottom: 28,
    zIndex: 5,
  },
  user: { color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 4 },
  caption: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
  index: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", marginTop: 6 },
});
