import { useCallback } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  blockUser,
  deletePostComment,
  pinPostComment,
  submitCommentReport,
  toggleMuteUser,
  type CommentItem,
} from "@/api/social";
import {
  moveCommentPin,
  postCommentsQueryKey,
  removeCommentFromBuckets,
  type PostCommentsResponse,
} from "@/api/post-comments-query";
import { shareWithOs } from "@/features/share/share-sheet-actions";
import { postUrl } from "@/lib/post-share";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useI18n } from "@/i18n/I18nProvider";

export function useCommentContextActions(postId: string | null) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const handlePin = useCallback(
    (comment: CommentItem) => {
      if (!postId) return;
      const next = !comment.isPinned;
      queryClient.setQueryData<PostCommentsResponse>(postCommentsQueryKey(postId), (old) =>
        moveCommentPin(old, comment.id, next)
      );
      void pinPostComment(comment.id, next).catch((err) => {
        queryClient.setQueryData<PostCommentsResponse>(postCommentsQueryKey(postId), (old) =>
          moveCommentPin(old, comment.id, !next)
        );
        showIslandError(t("m.common.error"), err instanceof Error ? err.message : t("toast.retry"));
      });
    },
    [postId, queryClient, t]
  );

  const handleShare = useCallback(
    (comment: CommentItem) => {
      if (!postId) return;
      const url = `${postUrl(postId)}#comment-${comment.id}`;
      void shareWithOs(url).catch(() => {
        showIslandError(t("m.common.error"), t("share.srsq7vp"));
      });
    },
    [postId, t]
  );

  const handleQuite = useCallback(
    (comment: CommentItem) => {
      void toggleMuteUser(comment.author.id, comment.author.username)
        .then((res) => {
          showIslandSuccess(
            res.muted ? t("post.menu.mutedToast") : t("post.menu.unmutedToast")
          );
        })
        .catch((err) => {
          showIslandError(
            t("m.common.error"),
            err instanceof Error ? err.message : t("toast.retry")
          );
        });
    },
    [t]
  );

  const handleReport = useCallback(
    (comment: CommentItem) => {
      if (!postId) return;
      void submitCommentReport({
        postId,
        commentId: comment.id,
        reportedUserId: comment.author.id,
        reason: "SPAM",
      })
        .then(() => {
          showIslandSuccess(t("m.feed.report_submitted"), t("m.feed.our_team_will_review_it"));
        })
        .catch((err) => {
          showIslandError(
            t("m.feed.report_failed"),
            err instanceof Error ? err.message : t("toast.retry")
          );
        });
    },
    [postId, t]
  );

  const handleBlock = useCallback(
    (comment: CommentItem) => {
      void blockUser(comment.author.id)
        .then(() => {
          if (postId) {
            void queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
            void queryClient.invalidateQueries({ queryKey: ["mobile-post", postId] });
          }
          showIslandSuccess(
            t("m.feed.blocked"),
            t("m.feed.blocked_authorusername", {
              authorUsername: String(comment.author.username),
            })
          );
        })
        .catch((err) => {
          showIslandError(
            t("m.feed.block_failed"),
            err instanceof Error ? err.message : t("toast.retry")
          );
        });
    },
    [postId, queryClient, t]
  );

  const handleDelete = useCallback(
    (comment: CommentItem) => {
      if (!postId) return;
      Alert.alert(t("post.menu.delete"), t("comments.deleteConfirm"), [
        { text: t("toast.cancel"), style: "cancel" },
        {
          text: t("post.menu.delete"),
          style: "destructive",
          onPress: () => {
            queryClient.setQueryData<PostCommentsResponse>(
              postCommentsQueryKey(postId),
              (old) => removeCommentFromBuckets(old, comment.id)
            );
            void deletePostComment(comment.id).catch((err) => {
              void queryClient.invalidateQueries({ queryKey: postCommentsQueryKey(postId) });
              showIslandError(
                t("m.common.error"),
                err instanceof Error ? err.message : t("comments.deleteFailed")
              );
            });
          },
        },
      ]);
    },
    [postId, queryClient, t]
  );

  return { handlePin, handleShare, handleQuite, handleReport, handleBlock, handleDelete };
}
