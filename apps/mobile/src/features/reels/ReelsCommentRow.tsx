import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CommentItem } from "@/api/social";
import { CommentAvatar } from "@/features/feed/CommentAvatar";
import { CommentMediaBlock } from "@/features/feed/CommentMediaBlock";
import {
  CommentThreadExtras,
  type CommentReplyTarget,
} from "@/features/feed/CommentThreadExtras";
import { TranslatableText } from "@/ui/TranslatableText";
import { formatCommentTimeAgo } from "@/lib/format-relative-time";
import { useI18n } from "@/i18n/I18nProvider";

export type ReelsCommentRowProps = {
  comment: CommentItem;
  expandNonce?: number;
  canPin?: boolean;
  canLike?: boolean;
  likeBusy?: boolean;
  onReply: (target: CommentReplyTarget) => void;
  onLike?: (comment: CommentItem) => void;
  onPin?: (comment: CommentItem) => void;
  onOpenAuthor?: (username: string) => void;
};

export function commentDisplayName(comment: CommentItem, fallback: string): string {
  return comment.author.username?.trim() || comment.author.name?.trim() || fallback;
}

export function ReelsCommentRow({
  comment,
  expandNonce,
  canPin = false,
  canLike = false,
  likeBusy = false,
  onReply,
  onLike,
  onPin,
  onOpenAuthor,
}: ReelsCommentRowProps) {
  const { t } = useI18n();
  const nickname = commentDisplayName(comment, t("m.feed.unknown_user"));
  const liked = Boolean(comment.liked);
  const likeCount = comment.likeCount ?? 0;
  const timeLabel = formatCommentTimeAgo(comment.createdAt);

  return (
    <View style={styles.row} nativeID={`comment-${comment.id}`}>
      <Pressable
        onPress={() => onOpenAuthor?.(comment.author.username)}
        disabled={!onOpenAuthor}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={nickname}
      >
        <CommentAvatar uri={comment.author.image} name={nickname} size={36} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Pressable
            onPress={() => onOpenAuthor?.(comment.author.username)}
            disabled={!onOpenAuthor}
            style={styles.namePress}
          >
            <Text style={styles.nickname} numberOfLines={1}>
              {nickname}
            </Text>
          </Pressable>
          {timeLabel ? <Text style={styles.time}>{timeLabel}</Text> : null}
          {comment.isPinned ? (
            <Text style={styles.time}> · {t("m.feed.pinned_comments")}</Text>
          ) : null}
        </View>
        {comment.content ? (
          <TranslatableText text={comment.content} style={styles.body} lightLinks />
        ) : null}
        <CommentMediaBlock mediaType={comment.mediaType} mediaUrl={comment.mediaUrl} />
        <CommentThreadExtras
          comment={comment}
          rootId={comment.id}
          light
          expandNonce={expandNonce}
          onReply={onReply}
          onOpenAuthor={onOpenAuthor}
        />
      </View>

      <View style={styles.trailing}>
        {canLike && onLike ? (
          <Pressable
            onPress={() => onLike(comment)}
            disabled={likeBusy}
            hitSlop={8}
            style={styles.likeBtn}
            accessibilityRole="button"
            accessibilityLabel={liked ? t("m.feed.unlike") : t("m.feed.like")}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={14}
              color={liked ? "#FF4D6D" : "rgba(255,255,255,0.4)"}
            />
            {likeCount > 0 ? (
              <Text style={[styles.likeCount, liked && styles.likeCountOn]}>{likeCount}</Text>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.likeBtn} />
        )}
        {canPin && onPin ? (
          <Pressable onPress={() => onPin(comment)} hitSlop={8} style={styles.pinBtn}>
            <Ionicons
              name={comment.isPinned ? "pin" : "pin-outline"}
              size={14}
              color="rgba(255,255,255,0.4)"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    width: "100%",
  },
  content: {
    flex: 1,
    flexDirection: "column",
    marginLeft: 12,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  namePress: { maxWidth: "70%" },
  nickname: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  time: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  body: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  trailing: {
    marginLeft: 8,
    alignItems: "center",
    paddingTop: 2,
    minWidth: 22,
  },
  likeBtn: {
    alignItems: "center",
    minHeight: 22,
  },
  likeCount: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  likeCountOn: { color: "#FF4D6D" },
  pinBtn: { marginTop: 10 },
});
