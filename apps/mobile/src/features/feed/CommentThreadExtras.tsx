import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { fetchCommentReplies, type CommentItem } from "@/api/social";
import { CommentAvatar } from "@/features/feed/CommentAvatar";
import { CommentMediaBlock } from "@/features/feed/CommentMediaBlock";
import { TranslatableText } from "@/ui/TranslatableText";
import { formatCommentTimeAgo } from "@/lib/format-relative-time";
import { useI18n } from "@/i18n/I18nProvider";

export type CommentReplyTarget = {
  rootId: string;
  userId: string;
  username: string;
};

type Props = {
  comment: CommentItem;
  rootId: string;
  light?: boolean;
  expandNonce?: number;
  onReply: (target: CommentReplyTarget) => void;
  onLongPress?: (comment: CommentItem) => void;
  onOpenAuthor?: (username: string) => void;
};

function replyName(reply: CommentItem, fallback: string) {
  return reply.author.username?.trim() || reply.author.name?.trim() || fallback;
}

export function CommentThreadExtras({
  comment,
  rootId,
  light = false,
  expandNonce,
  onReply,
  onLongPress,
  onOpenAuthor,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const replyCount = comment.replyCount ?? 0;
  const muted = light ? "rgba(255,255,255,0.4)" : undefined;
  const unknown = t("m.feed.unknown_user");

  async function load(reset = false) {
    if (loading) return;
    setLoading(true);
    try {
      const page = await fetchCommentReplies(comment.id, reset ? null : cursor);
      const next = page.replies ?? [];
      setReplies((prev) => (reset ? next : [...prev, ...next]));
      setCursor(page.nextCursor ?? null);
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!expandNonce) return;
    setExpanded(true);
    if (replies.length < replyCount) void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandNonce]);

  return (
    <View>
      <Pressable
        onPress={() =>
          onReply({
            rootId,
            userId: comment.author.id,
            username: comment.author.username,
          })
        }
        hitSlop={8}
        style={styles.replyBtn}
      >
        <Text style={[styles.replyLabel, muted ? { color: muted } : null]}>{t("m.feed.reply")}</Text>
      </Pressable>
      {replyCount > 0 ? (
        <Pressable
          onPress={() => {
            if (expanded) {
              setExpanded(false);
              return;
            }
            if (replies.length === 0) void load(true);
            else setExpanded(true);
          }}
          hitSlop={8}
          style={styles.toggle}
        >
          <Text style={[styles.toggleLabel, muted ? { color: muted } : null]}>
            {expanded
              ? t("m.feed.hide_replies")
              : t("m.feed.view_replies", { count: String(replyCount) })}
          </Text>
        </Pressable>
      ) : null}
      {expanded
        ? replies.map((reply) => {
            const nickname = replyName(reply, unknown);
            const timeLabel = formatCommentTimeAgo(reply.createdAt);
            return (
              <Pressable
                key={reply.id}
                style={styles.replyRow}
                nativeID={`comment-${reply.id}`}
                delayLongPress={500}
                onLongPress={
                  onLongPress
                    ? () => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onLongPress(reply);
                      }
                    : undefined
                }
              >
                <Pressable
                  onPress={() => onOpenAuthor?.(reply.author.username)}
                  disabled={!onOpenAuthor}
                  hitSlop={4}
                >
                  <CommentAvatar uri={reply.author.image} name={nickname} size={28} />
                </Pressable>
                <View style={styles.replyContent}>
                  <View style={styles.replyNameRow}>
                    <Pressable
                      onPress={() => onOpenAuthor?.(reply.author.username)}
                      disabled={!onOpenAuthor}
                    >
                      <Text
                        style={[styles.replyUser, light && styles.replyUserLight]}
                        numberOfLines={1}
                      >
                        {nickname}
                      </Text>
                    </Pressable>
                    {timeLabel ? (
                      <Text style={[styles.replyTime, muted ? { color: muted } : null]}>
                        {timeLabel}
                      </Text>
                    ) : null}
                  </View>
                  {reply.content ? (
                    <TranslatableText
                      text={reply.content}
                      mentionStates={reply.mentionStates}
                      style={[styles.replyBody, light && styles.replyBodyLight]}
                      lightLinks={light}
                    />
                  ) : null}
                  <CommentMediaBlock
                    mediaType={reply.mediaType}
                    mediaUrl={reply.mediaUrl}
                    mediaMeta={reply.mediaMeta}
                  />
                  <Pressable
                    onPress={() =>
                      onReply({
                        rootId,
                        userId: reply.author.id,
                        username: reply.author.username,
                      })
                    }
                    hitSlop={8}
                    style={styles.replyBtn}
                  >
                    <Text style={[styles.replyLabel, muted ? { color: muted } : null]}>
                      {t("m.feed.reply")}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        : null}
      {expanded && cursor ? (
        <Pressable onPress={() => void load(false)} disabled={loading} hitSlop={8}>
          {loading ? (
            <ActivityIndicator size="small" color={light ? "#fff" : undefined} />
          ) : (
            <Text style={[styles.toggleLabel, muted ? { color: muted } : null]}>
              {t("m.feed.view_replies", { count: String(replyCount) })}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  replyBtn: { marginTop: 6, alignSelf: "flex-start" },
  replyLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  toggle: { marginTop: 8, alignSelf: "flex-start" },
  toggleLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    width: "100%",
  },
  replyContent: {
    flex: 1,
    flexDirection: "column",
    marginLeft: 10,
    minWidth: 0,
  },
  replyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  replyUser: { fontWeight: "700", fontSize: 13, marginBottom: 0 },
  replyUserLight: { color: "#fff" },
  replyTime: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    marginLeft: 6,
  },
  replyBody: { fontSize: 14, lineHeight: 20 },
  replyBodyLight: { color: "#fff" },
});
