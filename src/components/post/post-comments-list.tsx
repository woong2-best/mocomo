"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PostCommentRow, type PostCommentRowData } from "@/components/post/post-comment-row";
import {
  COMMENT_ADDED_EVENT,
  COMMENT_CONFIRMED_EVENT,
  COMMENT_FAILED_EVENT,
  type OptimisticComment,
} from "@/lib/comment-optimistic-sync";

export type ServerComment = {
  id: string;
  content: string;
  createdAt: Date | string;
  likeCount: number;
  likedByMe: boolean;
  author: {
    id: string;
    name: string | null;
    username: string;
    supportTierSent?: string | null;
  };
  replies: {
    id: string;
    content: string;
    likeCount: number;
    likedByMe: boolean;
    author: {
      id: string;
      name: string | null;
      username: string;
      supportTierSent?: string | null;
    };
  }[];
};

type ListComment = PostCommentRowData & {
  pending?: boolean;
  replies: PostCommentRowData[];
};

function toListComment(c: ServerComment): ListComment {
  return {
    id: c.id,
    content: c.content,
    likeCount: c.likeCount,
    likedByMe: c.likedByMe,
    author: c.author,
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      likeCount: r.likeCount,
      likedByMe: r.likedByMe,
      author: r.author,
    })),
  };
}

function optimisticToList(c: OptimisticComment): ListComment {
  return {
    id: c.id,
    content: c.content,
    likeCount: 0,
    likedByMe: false,
    pending: c.pending,
    author: {
      id: c.author.id ?? c.author.username,
      name: c.author.name,
      username: c.author.username,
      supportTierSent: c.author.supportTierSent,
    },
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      likeCount: 0,
      likedByMe: false,
      author: {
        id: r.author.id ?? r.author.username,
        name: r.author.name,
        username: r.author.username,
        supportTierSent: r.author.supportTierSent,
      },
    })),
  };
}

export function PostCommentsList({
  postId,
  initialComments,
  emptyLabel,
  showIdHandle = true,
}: {
  postId: string;
  initialComments: ServerComment[];
  emptyLabel: string;
  showIdHandle?: boolean;
}) {
  const [comments, setComments] = useState<ListComment[]>(() =>
    initialComments.map(toListComment)
  );

  useEffect(() => {
    setComments((prev) => {
      const pending = prev.filter((c) => c.pending);
      const fromServer = initialComments.map(toListComment);
      const serverIds = new Set(fromServer.map((c) => c.id));
      const stillPending = pending.filter((p) => !serverIds.has(p.id));
      return [...fromServer, ...stillPending];
    });
  }, [initialComments]);

  useEffect(() => {
    function onAdded(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; comment: OptimisticComment }>).detail;
      if (!detail || detail.postId !== postId) return;
      const comment = detail.comment;
      if (comment.parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.parentId
              ? {
                  ...c,
                  replies: [
                    ...c.replies,
                    {
                      id: comment.id,
                      content: comment.content,
                      likeCount: 0,
                      likedByMe: false,
                      author: {
                        id: comment.author.id ?? comment.author.username,
                        name: comment.author.name,
                        username: comment.author.username,
                        supportTierSent: comment.author.supportTierSent,
                      },
                    },
                  ],
                }
              : c
          )
        );
        return;
      }
      setComments((prev) => [...prev, optimisticToList(comment)]);
    }

    function onConfirmed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string; realId: string }>)
        .detail;
      if (!detail || detail.postId !== postId) return;
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === detail.pendingId) return { ...c, id: detail.realId, pending: false };
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === detail.pendingId ? { ...r, id: detail.realId } : r
            ),
          };
        })
      );
    }

    function onFailed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string }>).detail;
      if (!detail || detail.postId !== postId) return;
      setComments((prev) =>
        prev
          .filter((c) => c.id !== detail.pendingId)
          .map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== detail.pendingId),
          }))
      );
    }

    window.addEventListener(COMMENT_ADDED_EVENT, onAdded);
    window.addEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
    window.addEventListener(COMMENT_FAILED_EVENT, onFailed);
    return () => {
      window.removeEventListener(COMMENT_ADDED_EVENT, onAdded);
      window.removeEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
      window.removeEventListener(COMMENT_FAILED_EVENT, onFailed);
    };
  }, [postId]);

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <>
      {comments.map((c) => (
        <Card key={c.id} id={`comment-${c.id}`} className={c.pending ? "opacity-70" : undefined}>
          <CardContent className="p-4">
            <PostCommentRow
              comment={c}
              postId={postId}
              showIdHandle={showIdHandle}
            />
            {c.replies.map((r) => (
              <PostCommentRow
                key={r.id}
                comment={r}
                postId={postId}
                showIdHandle={showIdHandle}
                isReply
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
