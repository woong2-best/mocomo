"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PostCommentRow, type PostCommentRowData } from "@/components/post/post-comment-row";
import {
  COMMENT_ADDED_EVENT,
  COMMENT_CONFIRMED_EVENT,
  COMMENT_FAILED_EVENT,
  type OptimisticComment,
} from "@/lib/comment-optimistic-sync";
import type { SerializedComment, SerializedReply } from "@/lib/comment-service";
import { useLocale } from "@/components/providers/locale-provider";

type ListComment = PostCommentRowData & {
  pending?: boolean;
  isPinned?: boolean;
  replyCount: number;
  replies: PostCommentRowData[];
};

function fromSerialized(c: SerializedComment): ListComment {
  return {
    id: c.id,
    content: c.content,
    mentionStates: c.mentionStates,
    likeCount: c.likeCount,
    likedByMe: c.likedByMe,
    isPinned: c.isPinned,
    mediaType: c.mediaType,
    mediaUrl: c.mediaUrl,
    mediaMeta: c.mediaMeta,
    author: c.author,
    replyCount: c.replyCount,
    replies: (c.replies ?? []).map((r) => ({
      id: r.id,
      content: r.content,
      mentionStates: r.mentionStates,
      likeCount: r.likeCount,
      likedByMe: r.likedByMe,
      mediaType: r.mediaType,
      mediaUrl: r.mediaUrl,
      mediaMeta: r.mediaMeta,
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
    isPinned: false,
    mediaType: c.mediaType,
    mediaUrl: c.mediaUrl,
    mediaMeta: c.mediaMeta,
    author: {
      id: c.author.id ?? c.author.username,
      name: c.author.name,
      username: c.author.username,
      supportTierSent: c.author.supportTierSent,
    },
    replyCount: 0,
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

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function PostCommentsList({
  postId,
  postAuthorId,
  qna = false,
  sort = "oldest",
  initialPinned = [],
  initialTop = [],
  initialComments,
  initialCursor = null,
  emptyLabel,
  showIdHandle = true,
  expandNonceById = {},
  onReply,
  onReplyPosted,
}: {
  postId: string;
  postAuthorId: string;
  qna?: boolean;
  sort?: string;
  initialPinned?: SerializedComment[];
  initialTop?: SerializedComment[];
  initialComments: SerializedComment[];
  initialCursor?: string | null;
  emptyLabel: string;
  showIdHandle?: boolean;
  expandNonceById?: Record<string, number>;
  onReply?: (target: { rootId: string; userId: string; username: string }) => void;
  onReplyPosted?: (rootId: string) => void;
}) {
  const { t } = useLocale();
  const session = useSession();
  const viewerId = session.data?.user?.id ?? null;
  const canPin = !qna && !!viewerId && viewerId === postAuthorId;
  const ranked = !qna && sort === "ranked";

  const [pinned, setPinned] = useState<ListComment[]>(() => initialPinned.map(fromSerialized));
  const [top, setTop] = useState<ListComment[]>(() => initialTop.map(fromSerialized));
  const [comments, setComments] = useState<ListComment[]>(() =>
    initialComments.map(fromSerialized)
  );
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setPinned(initialPinned.map(fromSerialized));
    setTop(initialTop.map(fromSerialized));
    setComments(initialComments.map(fromSerialized));
    setCursor(initialCursor);
  }, [initialPinned, initialTop, initialComments, initialCursor]);

  useEffect(() => {
    function onAdded(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; comment: OptimisticComment }>).detail;
      if (!detail || detail.postId !== postId) return;
      const comment = detail.comment;
      if (comment.parentId) {
        const addReply = (list: ListComment[]) =>
          list.map((c) =>
            c.id === comment.parentId
              ? {
                  ...c,
                  replyCount: c.replyCount + 1,
                  replies: [
                    ...c.replies,
                    {
                      id: comment.id,
                      content: comment.content,
                      likeCount: 0,
                      likedByMe: false,
                      mediaType: comment.mediaType,
                      mediaUrl: comment.mediaUrl,
                      mediaMeta: comment.mediaMeta,
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
          );
        setPinned(addReply);
        setTop(addReply);
        setComments(addReply);
        onReplyPosted?.(comment.parentId);
        requestAnimationFrame(() => {
          document
            .getElementById(`comment-${comment.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        return;
      }
      const row = optimisticToList(comment);
      if (ranked) {
        setComments((prev) => [row, ...prev]);
      } else {
        setComments((prev) => [...prev, row]);
      }
    }

    function onConfirmed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string; realId: string }>)
        .detail;
      if (!detail || detail.postId !== postId) return;
      const swap = (list: ListComment[]) =>
        list.map((c) => {
          if (c.id === detail.pendingId) return { ...c, id: detail.realId, pending: false };
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === detail.pendingId ? { ...r, id: detail.realId } : r
            ),
          };
        });
      setPinned(swap);
      setTop(swap);
      setComments(swap);
    }

    function onFailed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string }>).detail;
      if (!detail || detail.postId !== postId) return;
      const drop = (list: ListComment[]) =>
        list
          .filter((c) => c.id !== detail.pendingId)
          .map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== detail.pendingId),
          }));
      setPinned(drop);
      setTop(drop);
      setComments(drop);
    }

    window.addEventListener(COMMENT_ADDED_EVENT, onAdded);
    window.addEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
    window.addEventListener(COMMENT_FAILED_EVENT, onFailed);
    return () => {
      window.removeEventListener(COMMENT_ADDED_EVENT, onAdded);
      window.removeEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
      window.removeEventListener(COMMENT_FAILED_EVENT, onFailed);
    };
  }, [onReplyPosted, postId, ranked]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({ sort, limit: "20", cursor });
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comments?${qs}`, {
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        comments?: SerializedComment[];
        nextCursor?: string | null;
      };
      if (!res.ok) return;
      const extra = (body.comments ?? []).map(fromSerialized);
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...extra.filter((c) => !seen.has(c.id))];
      });
      setCursor(body.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  function onPinnedChange(id: string, nextPinned: boolean) {
    const all = [...pinned, ...top, ...comments];
    const target = all.find((c) => c.id === id);
    if (!target) return;
    if (nextPinned) {
      const row = { ...target, isPinned: true };
      setComments((prev) => prev.filter((c) => c.id !== id));
      setTop((prev) => prev.filter((c) => c.id !== id));
      setPinned((prev) => {
        if (prev.some((c) => c.id === id)) {
          return prev.map((c) => (c.id === id ? row : c));
        }
        return [...prev.filter((c) => c.id !== id), row].slice(0, 3);
      });
      return;
    }
    const row = { ...target, isPinned: false };
    setPinned((prev) => prev.filter((c) => c.id !== id));
    setComments((prev) => [row, ...prev.filter((c) => c.id !== id)]);
  }

  function renderCard(c: ListComment) {
    return (
      <CommentThreadCard
        key={c.id}
        comment={c}
        postId={postId}
        showIdHandle={showIdHandle}
        canPin={canPin}
        expandNonce={expandNonceById[c.id]}
        onPinnedChange={onPinnedChange}
        onReply={onReply}
      />
    );
  }

  const empty = pinned.length + top.length + comments.length === 0;
  if (empty) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  if (!ranked) {
    return <>{comments.map(renderCard)}</>;
  }

  return (
    <>
      {pinned.length > 0 ? (
        <>
          <SectionLabel>{t("comments.pinned")}</SectionLabel>
          {pinned.map(renderCard)}
        </>
      ) : null}
      {top.length > 0 ? (
        <>
          <SectionLabel>{t("comments.top")}</SectionLabel>
          {top.map(renderCard)}
        </>
      ) : null}
      {comments.length > 0 ? (
        <>
          <SectionLabel>{t("comments.recent")}</SectionLabel>
          {comments.map(renderCard)}
        </>
      ) : null}
      {cursor ? (
        <button
          type="button"
          className="w-full rounded-lg py-2 text-sm font-medium text-primary hover:underline"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? t("post.loadingComments") : t("comments.more")}
        </button>
      ) : null}
    </>
  );
}

function CommentThreadCard({
  comment,
  postId,
  showIdHandle,
  canPin,
  expandNonce,
  onPinnedChange,
  onReply,
}: {
  comment: ListComment;
  postId: string;
  showIdHandle: boolean;
  canPin: boolean;
  expandNonce?: number;
  onPinnedChange: (id: string, nextPinned: boolean) => void;
  onReply?: (target: { rootId: string; userId: string; username: string }) => void;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState(comment.replies);
  const [replyCursor, setReplyCursor] = useState<string | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    if (comment.replies.length > replies.length) {
      setReplies(comment.replies);
    }
  }, [comment.replies, replies.length]);

  async function loadReplies(reset = false) {
    if (loadingReplies) return;
    setLoadingReplies(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (!reset && replyCursor) qs.set("cursor", replyCursor);
      const res = await fetch(`/api/comments/${comment.id}/replies?${qs}`, {
        credentials: "include",
      });
      const body = (await res.json()) as {
        replies?: SerializedReply[];
        nextCursor?: string | null;
      };
      if (!res.ok) return;
      const next = (body.replies ?? []).map((r) => ({
        id: r.id,
        content: r.content,
        likeCount: r.likeCount,
        likedByMe: r.likedByMe,
        mediaType: r.mediaType,
        mediaUrl: r.mediaUrl,
        mediaMeta: r.mediaMeta,
        author: r.author,
      }));
      setReplies((prev) => {
        if (!reset) {
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...next.filter((r) => !seen.has(r.id))];
        }
        const incomingIds = new Set(next.map((r) => r.id));
        const pending = prev.filter(
          (r) => r.id.startsWith("pending-") && !incomingIds.has(r.id)
        );
        return [...next, ...pending];
      });
      setReplyCursor(body.nextCursor ?? null);
      setExpanded(true);
    } finally {
      setLoadingReplies(false);
    }
  }

  useEffect(() => {
    if (!expandNonce) return;
    setExpanded(true);
    if (replies.length < comment.replyCount) {
      void loadReplies(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandNonce]);

  function startReply(row: PostCommentRowData) {
    onReply?.({
      rootId: comment.id,
      userId: row.author.id,
      username: row.author.username,
    });
  }

  return (
    <Card id={`comment-${comment.id}`} className={comment.pending ? "opacity-70" : undefined}>
      <CardContent className="p-4">
        {comment.isPinned ? (
          <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Pin className="h-3 w-3" />
            {t("comments.pinned")}
          </p>
        ) : null}
        <PostCommentRow
          comment={comment}
          postId={postId}
          showIdHandle={showIdHandle}
          canPin={canPin}
          isPinned={!!comment.isPinned}
          onPinnedChange={onPinnedChange}
          onReply={() => startReply(comment)}
        />
        {comment.replyCount > 0 ? (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (expanded) {
                setExpanded(false);
                return;
              }
              if (replies.length === 0) void loadReplies(true);
              else setExpanded(true);
            }}
          >
            {expanded
              ? t("comments.hideReplies")
              : t("comments.viewReplies", { count: comment.replyCount })}
          </button>
        ) : null}
        {expanded
          ? replies.map((r) => (
              <div key={r.id} id={`comment-${r.id}`}>
                <PostCommentRow
                  comment={r}
                  postId={postId}
                  showIdHandle={showIdHandle}
                  isReply
                  onReply={() => startReply(r)}
                />
              </div>
            ))
          : null}
        {expanded && replyCursor ? (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-primary"
            disabled={loadingReplies}
            onClick={() => void loadReplies(false)}
          >
            {loadingReplies ? t("common.loading") : t("reels.s1vqpobh")}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
