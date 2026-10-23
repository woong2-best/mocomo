"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCommentRow, type PostCommentRowData } from "@/components/post/post-comment-row";
import {
  COMMENT_ADDED_EVENT,
  COMMENT_CONFIRMED_EVENT,
  COMMENT_FAILED_EVENT,
  type OptimisticComment,
} from "@/lib/comment-optimistic-sync";
import type { SerializedComment } from "@/lib/comment-service";
import { formatQnaBountyMoco } from "@/lib/qna-bounty-format";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type AnswerRow = PostCommentRowData & {
  createdAt?: string;
  acceptedAt?: string | null;
  pending?: boolean;
  replies: PostCommentRowData[];
};

function fromSerialized(c: SerializedComment): AnswerRow {
  return {
    id: c.id,
    content: c.content,
    likeCount: c.likeCount,
    likedByMe: c.likedByMe,
    createdAt: c.createdAt,
    acceptedAt: c.acceptedAt,
    author: c.author,
    replies: (c.replies ?? []).map((r) => ({
      id: r.id,
      content: r.content,
      likeCount: r.likeCount,
      likedByMe: r.likedByMe,
      author: r.author,
    })),
  };
}

export function QnaAnswerList({
  postId,
  postAuthorId,
  acceptedCommentId,
  bountyCenti,
  initialComments,
  initialCursor = null,
  emptyLabel,
}: {
  postId: string;
  postAuthorId: string;
  acceptedCommentId?: string | null;
  bountyCenti: number;
  initialComments: SerializedComment[];
  initialCursor?: string | null;
  emptyLabel: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();
  const viewerId = session.data?.user?.id ?? null;
  const isOwner = !!viewerId && viewerId === postAuthorId;

  const [comments, setComments] = useState<AnswerRow[]>(() => initialComments.map(fromSerialized));
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [acceptedId, setAcceptedId] = useState<string | null>(acceptedCommentId ?? null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setComments(initialComments.map(fromSerialized));
    setCursor(initialCursor);
    setAcceptedId(acceptedCommentId ?? null);
  }, [initialComments, initialCursor, acceptedCommentId]);

  useEffect(() => {
    function onAdded(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; comment: OptimisticComment }>).detail;
      if (!detail || detail.postId !== postId || detail.comment.parentId) return;
      const c = detail.comment;
      setComments((prev) => [
        ...prev,
        {
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
          replies: [],
        },
      ]);
    }
    function onConfirmed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string; realId: string }>).detail;
      if (!detail || detail.postId !== postId) return;
      setComments((prev) =>
        prev.map((c) => (c.id === detail.pendingId ? { ...c, id: detail.realId, pending: false } : c))
      );
    }
    function onFailed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string }>).detail;
      if (!detail || detail.postId !== postId) return;
      setComments((prev) => prev.filter((c) => c.id !== detail.pendingId));
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

  const ordered = useMemo(() => {
    if (!acceptedId) return comments;
    const selected = comments.filter((c) => c.id === acceptedId);
    const rest = comments.filter((c) => c.id !== acceptedId);
    return [...selected, ...rest];
  }, [comments, acceptedId]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({ sort: "oldest", limit: "20", cursor });
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

  async function accept(commentId: string) {
    if (!isOwner || acceptedId || acceptingId) return;
    setError("");
    setAcceptingId(commentId);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/accept-answer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || t("qna.accept_failed"));
      setAcceptedId(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, acceptedAt: new Date().toISOString() } : c))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qna.accept_failed"));
    } finally {
      setAcceptingId(null);
    }
  }

  if (ordered.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {ordered.map((c) => {
        const selected = acceptedId === c.id;
        const canAccept =
          isOwner && !acceptedId && !c.pending && c.author.id !== postAuthorId;
        return (
          <div key={c.id} id={`comment-${c.id}`} className={cn(c.pending && "opacity-70")}>
            {selected ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-folk-cobalt/10 px-3 py-2 text-sm font-medium text-folk-cobalt">
                <Check className="h-4 w-4" />
                {t("qna.selected_banner")}
              </div>
            ) : null}
            <Card className={cn(selected && "border-folk-cobalt/30 bg-folk-cobalt/[0.03]")}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {c.author.name || c.author.username}
                    </p>
                    {selected && bountyCenti > 0 ? (
                      <p className="text-xs text-folk-cobalt">
                        {t("qna.bounty_badge", { amount: formatQnaBountyMoco(bountyCenti) })}
                      </p>
                    ) : null}
                  </div>
                  {canAccept ? (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full bg-folk-cobalt hover:bg-folk-cobalt/90"
                      disabled={!!acceptingId}
                      onClick={() => void accept(c.id)}
                    >
                      {t("qna.accept")}
                    </Button>
                  ) : null}
                </div>
                <PostCommentRow comment={c} postId={postId} showIdHandle />
                {c.replies.map((r) => (
                  <PostCommentRow key={r.id} comment={r} postId={postId} showIdHandle isReply />
                ))}
                <div className="space-y-1 text-xs text-muted-foreground">
                  {c.createdAt ? <p>{format(new Date(c.createdAt), "yyyy.MM.dd")}</p> : null}
                  {selected ? <p>{t("qna.selected_by_author")}</p> : null}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
      {cursor ? (
        <button
          type="button"
          className="w-full rounded-lg py-2 text-sm font-medium text-folk-cobalt hover:underline"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? t("post.loadingComments") : t("comments.more")}
        </button>
      ) : null}
    </div>
  );
}
