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
import type { SerializedComment } from "@/lib/comment-service";
import { useLocale } from "@/components/providers/locale-provider";

type ListComment = PostCommentRowData & {
  pending?: boolean;
  isPinned?: boolean;
  replies: PostCommentRowData[];
};

function fromSerialized(c: SerializedComment): ListComment {
  return {
    id: c.id,
    content: c.content,
    likeCount: c.likeCount,
    likedByMe: c.likedByMe,
    isPinned: c.isPinned,
    mediaType: c.mediaType,
    mediaUrl: c.mediaUrl,
    author: c.author,
    replies: (c.replies ?? []).map((r) => ({
      id: r.id,
      content: r.content,
      likeCount: r.likeCount,
      likedByMe: r.likedByMe,
      mediaType: r.mediaType,
      mediaUrl: r.mediaUrl,
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
                  replies: [
                    ...c.replies,
                    {
                      id: comment.id,
                      content: comment.content,
                      likeCount: 0,
                      likedByMe: false,
                      mediaType: comment.mediaType,
                      mediaUrl: comment.mediaUrl,
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
  }, [postId, ranked]);

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
      <Card key={c.id} id={`comment-${c.id}`} className={c.pending ? "opacity-70" : undefined}>
        <CardContent className="p-4">
          {c.isPinned ? (
            <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Pin className="h-3 w-3" />
              {t("comments.pinned")}
            </p>
          ) : null}
          <PostCommentRow
            comment={c}
            postId={postId}
            showIdHandle={showIdHandle}
            canPin={canPin}
            isPinned={!!c.isPinned}
            onPinnedChange={onPinnedChange}
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
