"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  Heart,
  Loader2,
  X,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CommentForm } from "@/components/post/comment-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  COMMENT_ADDED_EVENT,
  COMMENT_CONFIRMED_EVENT,
  COMMENT_FAILED_EVENT,
  type OptimisticComment,
} from "@/lib/comment-optimistic-sync";
import { needsTranslation } from "@/lib/text-language";
import { useLocale } from "@/components/providers/locale-provider";

type ApiAuthor = {
  name: string | null;
  username: string;
  image?: string | null;
  supportTierSent?: string | null;
};

type ApiReply = {
  id: string;
  content: string;
  createdAt?: string;
  author: ApiAuthor;
};

type ApiComment = {
  id: string;
  content: string;
  createdAt: string;
  author: ApiAuthor;
  _count?: { replies: number };
  replies: ApiReply[];
};

type PanelReply = {
  id: string;
  content: string;
  createdAt?: string;
  author: ApiAuthor;
};

type PanelComment = {
  id: string;
  content: string;
  createdAt?: string;
  pending?: boolean;
  parentId?: string;
  author: ApiAuthor;
  replies: PanelReply[];
  replyTotal: number;
};

type Props = {
  open: boolean;
  postId: string;
  initialCount?: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

const SORT_OPTIONS: { id: "popular" | "newest"; label: string }[] = [
  { id: "popular", label: "인기 댓글" },
  { id: "newest", label: "최신순" },
];

function formatRelativeKo(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}주`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}개월`;
  return `${Math.floor(month / 12)}년`;
}

function toPanelComment(c: ApiComment): PanelComment {
  return {
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    author: c.author,
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      author: r.author,
    })),
    replyTotal: Math.max(c._count?.replies ?? 0, c.replies.length),
  };
}

function ReplyRow({
  comment,
  postId,
  userLoggedIn,
}: {
  comment: PanelReply;
  postId: string;
  userLoggedIn: boolean;
}) {
  const [likeCount, setLikeCount] = useState(0);
  const [replyOpen, setReplyOpen] = useState(false);
  return (
    <IgCommentRow
      comment={comment}
      postId={postId}
      userLoggedIn={userLoggedIn}
      replyOpen={replyOpen}
      onToggleReply={() => setReplyOpen((v) => !v)}
      liked={likeCount > 0}
      likeCount={likeCount}
      onToggleLike={() => setLikeCount((n) => (n > 0 ? 0 : 1))}
      isReply
    />
  );
}

function IgCommentRow({
  comment,
  postId,
  userLoggedIn,
  expanded,
  onToggleExpand,
  replyOpen,
  onToggleReply,
  liked,
  likeCount,
  onToggleLike,
  isReply = false,
}: {
  comment: PanelComment | PanelReply;
  postId: string;
  userLoggedIn: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  replyOpen: boolean;
  onToggleReply: () => void;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  isReply?: boolean;
}) {
  const { locale, t } = useLocale();
  const needsTr = useMemo(
    () => needsTranslation(comment.content, locale),
    [comment.content, locale]
  );
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [trLoading, setTrLoading] = useState(false);
  const display = showTranslated && translated ? translated : comment.content;
  const replyTotal =
    "replyTotal" in comment ? comment.replyTotal : 0;
  const replies = "replies" in comment ? comment.replies : [];
  const username = comment.author.username;
  const displayName = comment.author.name || username;

  async function runTranslate() {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translated) {
      setShowTranslated(true);
      return;
    }
    setTrLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: comment.content }),
      });
      const data = (await res.json()) as { ok?: boolean; translated?: string };
      if (data.ok && data.translated) {
        setTranslated(data.translated);
        setShowTranslated(true);
      }
    } finally {
      setTrLoading(false);
    }
  }

  return (
    <li className={cn("flex gap-3", isReply && "mt-3")}>
      <Link href={`/u/${username}`} className="shrink-0 self-start">
        <Avatar className="!h-8 !w-8 !rounded-full !ring-0">
          <AvatarImage
            src={comment.author.image ?? undefined}
            alt=""
            className="!rounded-full"
          />
          <AvatarFallback className="!rounded-full bg-neutral-700 text-[11px] text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="pr-8">
          <p className="text-[13px] leading-snug">
            <Link
              href={`/u/${username}`}
              className="font-semibold text-white hover:text-white/90"
            >
              {username}
            </Link>{" "}
            <span className="text-white/40 tabular-nums">
              {formatRelativeKo(comment.createdAt)}
            </span>
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-white whitespace-pre-wrap break-words">
            {display}
          </p>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/40">
          {likeCount > 0 && (
            <span className="tabular-nums">좋아요 {formatNumber(likeCount)}개</span>
          )}
          <button
            type="button"
            className="hover:text-white/70"
            onClick={onToggleReply}
          >
            답글 달기
          </button>
          {needsTr && (
            <button
              type="button"
              className="hover:text-white/70 disabled:opacity-50"
              disabled={trLoading}
              onClick={() => void runTranslate()}
            >
              {trLoading
                ? t("translate.loading")
                : showTranslated
                  ? t("translate.viewOriginal")
                  : "번역 보기"}
            </button>
          )}
        </div>

        {!isReply && replyTotal > 0 && (
          <button
            type="button"
            className="mt-2 flex items-center gap-2 text-[12px] text-white/40 hover:text-white/65"
            onClick={onToggleExpand}
          >
            <span className="inline-block h-px w-6 bg-white/30" aria-hidden />
            {expanded
              ? "답글 숨기기"
              : `답글 ${formatNumber(replyTotal)}개 모두 보기`}
          </button>
        )}

        {!isReply && expanded && replies.length > 0 && (
          <ul className="mt-1">
            {replies.map((r) => (
              <ReplyRow
                key={r.id}
                comment={r}
                postId={postId}
                userLoggedIn={userLoggedIn}
              />
            ))}
          </ul>
        )}

        {replyOpen && userLoggedIn && (
          <CommentForm
            postId={postId}
            parentId={comment.id}
            placeholder="답글 달기..."
            className="mt-2"
            inputClassName="h-9 rounded-full border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
          />
        )}
      </div>

      <button
        type="button"
        className="mt-1 shrink-0 self-start p-1 text-white/45 hover:text-white"
        aria-label={liked ? "좋아요 취소" : "좋아요"}
        aria-pressed={liked}
        onClick={onToggleLike}
      >
        <Heart
          className={cn(
            "h-3.5 w-3.5",
            liked && "fill-red-500 text-red-500"
          )}
        />
      </button>
    </li>
  );
}

export function ReelsCommentsPanel({
  open,
  postId,
  initialCount = 0,
  onClose,
  onCountChange,
}: Props) {
  const session = useSession();
  const user = session?.data?.user;
  const [sort, setSort] = useState<"popular" | "newest">("popular");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [comments, setComments] = useState<PanelComment[]>([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, number>>({});
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const totalRef = useRef(total);
  totalRef.current = total;

  const notifyCount = useCallback((next: number) => {
    if (totalRef.current === next) return;
    totalRef.current = next;
    setTotal(next);
    onCountChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    if (!open || !postId) return;

    const ac = new AbortController();
    setReplyTo(null);
    setExpanded({});
    setError("");
    setLoading(true);
    setComments([]);
    setTotal(initialCount);
    totalRef.current = initialCount;

    void (async () => {
      try {
        const res = await fetch(
          `/api/posts/${encodeURIComponent(postId)}/comments?sort=${sort}&limit=50`,
          { credentials: "include", signal: ac.signal }
        );
        const body = (await res.json().catch(() => ({}))) as {
          comments?: ApiComment[];
          total?: number;
          error?: string;
        };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          throw new Error(body.error || "댓글을 불러오지 못했습니다.");
        }
        const list = (body.comments ?? []).map(toPanelComment);
        setComments(list);
        notifyCount(
          typeof body.total === "number" ? body.total : list.length
        );
        setError("");
      } catch (e) {
        if (ac.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "댓글을 불러오지 못했습니다.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId, sort, notifyCount]);

  useEffect(() => {
    if (!open) setSortMenuOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || !postId) return;

    function onAdded(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; comment: OptimisticComment }>)
        .detail;
      if (!detail || detail.postId !== postId) return;
      const comment = detail.comment;
      const author: ApiAuthor = {
        name: comment.author.name,
        username: comment.author.username,
        image: user?.image ?? null,
        supportTierSent: comment.author.supportTierSent,
      };

      if (comment.parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.parentId
              ? {
                  ...c,
                  replyTotal: c.replyTotal + 1,
                  replies: [
                    ...c.replies,
                    {
                      id: comment.id,
                      content: comment.content,
                      createdAt: new Date().toISOString(),
                      author,
                    },
                  ],
                }
              : c
          )
        );
        setExpanded((prev) => ({ ...prev, [comment.parentId!]: true }));
      } else {
        const row: PanelComment = {
          id: comment.id,
          content: comment.content,
          createdAt: new Date().toISOString(),
          pending: comment.pending,
          author,
          replies: [],
          replyTotal: 0,
        };
        setComments((prev) =>
          sort === "newest" ? [row, ...prev] : [...prev, row]
        );
      }
      notifyCount(totalRef.current + 1);
    }

    function onConfirmed(e: Event) {
      const detail = (
        e as CustomEvent<{ postId: string; pendingId: string; realId: string }>
      ).detail;
      if (!detail || detail.postId !== postId) return;
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === detail.pendingId) {
            return { ...c, id: detail.realId, pending: false };
          }
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
            replyTotal: c.replies.some((r) => r.id === detail.pendingId)
              ? Math.max(0, c.replyTotal - 1)
              : c.replyTotal,
          }))
      );
      notifyCount(Math.max(0, totalRef.current - 1));
    }

    window.addEventListener(COMMENT_ADDED_EVENT, onAdded);
    window.addEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
    window.addEventListener(COMMENT_FAILED_EVENT, onFailed);
    return () => {
      window.removeEventListener(COMMENT_ADDED_EVENT, onAdded);
      window.removeEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
      window.removeEventListener(COMMENT_FAILED_EVENT, onFailed);
    };
  }, [notifyCount, open, postId, sort, user?.image]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "인기 댓글";
  const empty = !loading && !error && comments.length === 0;

  const panelBody = (
    <>
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1 pt-1">
        <h2 className="text-[15px] font-semibold text-white">
          댓글{total > 0 ? ` ${formatNumber(total)}` : ""}
        </h2>
        <div className="relative flex items-center gap-0.5">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
            aria-label="정렬"
            aria-expanded={sortMenuOpen}
            onClick={() => setSortMenuOpen((v) => !v)}
          >
            <ArrowDownWideNarrow className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
            aria-label="댓글 닫기"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
          {sortMenuOpen && (
            <div className="absolute right-10 top-10 z-10 min-w-[9rem] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 py-1 shadow-xl">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-left text-sm",
                    sort === opt.id
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/80 hover:bg-white/5"
                  )}
                  onClick={() => {
                    setSort(opt.id);
                    setSortMenuOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <p className="shrink-0 px-4 pb-2 text-[12px] text-white/40">{sortLabel}</p>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-1">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-300">{error}</p>
        ) : empty ? (
          <p className="py-10 text-center text-sm text-white/45">
            아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.
          </p>
        ) : (
          <ul className="space-y-5 pb-4">
            {comments.map((c) => {
              const likeCount = likedMap[c.id] ?? 0;
              return (
                <IgCommentRow
                  key={c.id}
                  comment={c}
                  postId={postId}
                  userLoggedIn={!!user}
                  expanded={!!expanded[c.id]}
                  onToggleExpand={() =>
                    setExpanded((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                  }
                  replyOpen={replyTo === c.id}
                  onToggleReply={() =>
                    setReplyTo((cur) => (cur === c.id ? null : c.id))
                  }
                  liked={likeCount > 0}
                  likeCount={likeCount}
                  onToggleLike={() =>
                    setLikedMap((prev) => ({
                      ...prev,
                      [c.id]: (prev[c.id] ?? 0) > 0 ? 0 : 1,
                    }))
                  }
                />
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        {user ? (
          <CommentForm
            postId={postId}
            placeholder="댓글 추가..."
            className="mt-0"
            inputClassName="h-10 rounded-full border-white/15 bg-transparent text-white placeholder:text-white/35"
          />
        ) : (
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${postId}`)}`}
            className="flex h-10 items-center rounded-full border border-white/15 px-4 text-sm text-white/45"
          >
            댓글을 쓰려면 로그인하세요
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "pointer-events-auto relative z-[230] hidden h-full shrink-0 flex-col overflow-hidden border-l border-white/10 bg-[#121212] text-white transition-[width,opacity,transform] duration-300 ease-out lg:flex",
          open
            ? "w-[min(100%,24rem)] translate-x-0 opacity-100"
            : "w-0 translate-x-4 opacity-0 pointer-events-none border-0"
        )}
        aria-hidden={!open}
        aria-label="댓글"
      >
        {open ? (
          <div className="flex h-full w-[min(100vw,24rem)] flex-col">{panelBody}</div>
        ) : null}
      </aside>

      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-[230] lg:hidden",
          open ? "visible" : "invisible"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-300",
            open ? "pointer-events-auto opacity-100" : "opacity-0"
          )}
          aria-label="댓글 닫기"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="댓글"
          className={cn(
            "pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[78dvh] flex-col overflow-hidden rounded-t-2xl bg-[#121212] text-white shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="flex justify-center py-2">
            <span className="h-1 w-10 rounded-full bg-white/25" />
          </div>
          {panelBody}
        </div>
      </div>
    </>
  );
}
