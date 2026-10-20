import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { formatViewCount } from "@/lib/post-view";
import { useI18n } from "@/i18n/I18nProvider";
import type { InstagramStoryPost } from "@/features/share/instagram-story-post";
import { storyCardText } from "@/features/share/story-card-text";

export const STORY_CARD_WIDTH = 540;

type Props = {
  post: InstagramStoryPost;
  onReady?: () => void;
};

function initial(name?: string | null) {
  return (name || "?").trim().slice(0, 1).toUpperCase() || "?";
}

/**
 * Off-screen Instagram Stories sticker — dark post card like X/Twitter share.
 */
export function InstagramStoryCard({ post, onReady }: Props) {
  const { t } = useI18n();
  const handle = post.hideIdentity
    ? t("m.feed.anonymous")
    : `@${post.authorUsername}`;
  const displayName = post.hideIdentity
    ? t("m.feed.anonymous")
    : post.authorName?.trim() || post.authorUsername;
  const body = storyCardText({ title: post.title, content: post.content });
  const avatarUri = post.hideIdentity ? null : post.authorImage?.trim() || null;
  const mediaUri = post.mediaUri?.trim() || null;

  const pending = useMemo(() => {
    let n = 0;
    if (avatarUri) n += 1;
    if (mediaUri) n += 1;
    return n;
  }, [avatarUri, mediaUri]);

  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    setLoaded(0);
  }, [avatarUri, mediaUri]);

  useEffect(() => {
    if (pending === 0 || loaded >= pending) {
      const timer = setTimeout(() => onReady?.(), 80);
      return () => clearTimeout(timer);
    }
    const timeout = setTimeout(() => onReady?.(), 2400);
    return () => clearTimeout(timeout);
  }, [loaded, onReady, pending]);

  const markLoaded = () => setLoaded((n) => n + 1);

  return (
    <View style={styles.card} collapsable={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              onLoad={markLoaded}
              onError={markLoaded}
            />
          ) : (
            <Text style={styles.avatarLetter}>{initial(displayName)}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            {handle}
          </Text>
        </View>
        <Text style={styles.brand}>MoCoMo</Text>
      </View>

      {body ? (
        <Text style={styles.body} numberOfLines={6}>
          {body}
        </Text>
      ) : null}

      {mediaUri ? (
        <View style={styles.mediaWrap}>
          <Image
            source={{ uri: mediaUri }}
            style={styles.media}
            resizeMode="cover"
            onLoad={markLoaded}
            onError={markLoaded}
          />
          {post.mediaIsVideo ? (
            <View style={styles.playBadge}>
              <Text style={styles.playBadgeText}>▶</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.stats}>
          {t("m.feed.story_card_stats", {
            likes: formatViewCount(post.likeCount ?? 0),
            comments: formatViewCount(post.commentCount ?? 0),
          })}
        </Text>
        <Text style={styles.domain}>mocomo.net</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: STORY_CARD_WIDTH,
    backgroundColor: "#000000",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#C5522A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarLetter: {
    color: "#FFFBF5",
    fontSize: 18,
    fontWeight: "800",
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  handle: {
    color: "#8B98A5",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 1,
  },
  brand: {
    color: "#C5522A",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  body: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "400",
  },
  mediaWrap: {
    width: "100%",
    height: 300,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#16181C",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  playBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  stats: {
    color: "#8B98A5",
    fontSize: 13,
    fontWeight: "500",
  },
  domain: {
    color: "#8B98A5",
    fontSize: 13,
    fontWeight: "600",
  },
});
