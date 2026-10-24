import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchCommentReplies, type CommentItem } from "@/api/social";
import { CommentMediaBlock } from "@/features/feed/CommentMediaBlock";
import { TranslatableText } from "@/ui/TranslatableText";
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
  onOpenAuthor?: (username: string) => void;
};

export function CommentThreadExtras({
  comment,
  rootId,
  light = false,
  expandNonce,
  onReply,
  onOpenAuthor,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const replyCount = comment.replyCount ?? 0;
  const color = light ? "rgba(255,255,255,0.55)" : undefined;

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
        <Text style={[styles.replyLabel, color ? { color } : null]}>{t("m.feed.reply")}</Text>
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
          <Text style={[styles.toggleLabel, color ? { color } : null]}>
            {expanded
              ? t("m.feed.hide_replies")
              : t("m.feed.view_replies", { count: String(replyCount) })}
          </Text>
        </Pressable>
      ) : null}
      {expanded
        ? replies.map((reply) => (
            <View key={reply.id} style={styles.replyRow} nativeID={`comment-${reply.id}`}>
              <Pressable onPress={() => onOpenAuthor?.(reply.author.username)}>
                <Text style={[styles.replyUser, light && { color: "#fff" }]}>
                  {reply.author.username}
                </Text>
              </Pressable>
              {reply.content ? (
                <TranslatableText
                  text={reply.content}
                  style={[styles.replyBody, light && { color: "rgba(255,255,255,0.9)" }]}
                  lightLinks={light}
                />
              ) : null}
              <CommentMediaBlock mediaType={reply.mediaType} mediaUrl={reply.mediaUrl} />
              <Pressable
                onPress={() =>
                  onReply({
                    rootId,
                    userId: reply.author.id,
                    username: reply.author.username,
                  })
                }
                hitSlop={8}
              >
                <Text style={[styles.replyLabel, color ? { color } : null]}>
                  {t("m.feed.reply")}
                </Text>
              </Pressable>
            </View>
          ))
        : null}
      {expanded && cursor ? (
        <Pressable onPress={() => void load(false)} disabled={loading} hitSlop={8}>
          {loading ? (
            <ActivityIndicator size="small" color={light ? "#fff" : undefined} />
          ) : (
            <Text style={[styles.toggleLabel, color ? { color } : null]}>
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
  replyLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  toggle: { marginTop: 8, alignSelf: "flex-start" },
  toggleLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  replyRow: {
    marginTop: 10,
    marginLeft: 20,
    paddingLeft: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(128,128,128,0.35)",
  },
  replyUser: { fontWeight: "800", marginBottom: 2 },
  replyBody: { fontSize: 14, lineHeight: 20 },
});
