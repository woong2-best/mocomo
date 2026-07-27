"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  Loader2,
  X,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CommentForm } from "@/components/post/comment-form";
import { TranslatableText } from "@/components/ui/translatable-text";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { SupportTierLevel } from "@prisma/client";
import {
  COMMENT_ADDED_EVENT,
  COMMENT_CONFIRMED_EVENT,
  COMMENT_FAILED_EVENT,
  type OptimisticComment,
} from "@/lib/comment-optimistic-sync";
import type { PostCommentSort } from "@/lib/post-queries";

type ApiComment = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string | null;
    username: string;
    supportTierSent?: string | null;
  };
  _count?: { replies: number };
  replies: {
    id: string;
    content: string;
    createdAt?: string;
    author: {
      name: string | null;
      username: string;
      supportTierSent?: string | null;
    };
  }[];
};

type Props = {
  open: boolean;
  postId: string;
  initialCount?: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

function safeTier(tier: string | null | undefined): SupportTierLevel {
  if (!tier) return "PEBBLE";
  const allowed = [
    "PEBBLE", "STONE", "COAL", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
    "EMERALD", "SAPPHIRE", "RUBY", "DIAMOND", "CRYSTAL", "MYTHRIL", "ORICHALCUM",
    "CELESTITE", "ASTRAL", "COSMIC", "ETERNAL",
  ];
  return allowed.includes(tier) ? (tier as SupportTierLevel) : "PEBBLE";
}

function toOptimistic(c: ApiComment): OptimisticComment {
  return {
    id: c.id,
    content: c.content,
    author: {
      name: c.author.name,
      username: c.author.username,
      supportTierSent: c.author.supportTierSent,
    },
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      author: {
        name: r.author.name,
        username: r.author.username,
        supportTierSent: r.author.supportTierSent,
      },
    })),
  };
}

const SORT_OPTIONS: { id: "popular" | "newest"; label: string }[] = [
  { id: "popular", label: "인기 댓글" },
  { id: "newest", label: "최신순" },
];

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
  const [comments, setComments] = useState<OptimisticComment[]>([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const load = useCallback(async (pid: string, s: PostCommentSort) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/posts/${encodeURIComponent(pid)}/comments?sort=${s}&limit=50`,
        { credentials: "include" }
      );
      const body = (await res.json().catch(() => ({}))) as {
        comments?: ApiComment[];
        total?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || "댓글을 불러오지 못했습니다.");
      }
      const list = (body.comments ?? []).map(toOptimistic);
      setComments(list);
      const nextTotal =
        typeof body.total === "number" ? body.total : list.length;
      setTotal(nextTotal);
      onCountChange?.(nextTotal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "댓글을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    if (!open || !postId) return;
    setReplyTo(null);
    void load(postId, sort);
  }, [open, postId, sort, load]);

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
                      author: comment.author,
                    },
                  ],
                }
              : c
          )
        );
      } else {
        setComments((prev) =>
          sort === "newest" ? [comment, ...prev] : [...prev, comment]
        );
      }
      setTotal((t) => {
        const next = t + 1;
        onCountChange?.(next);
        return next;
      });
    }

    function onConfirmed(e: Event) {
      const detail = (
        e as CustomEvent<{ postId: string; pendingId: string; realId: string }>
      ).detail;
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
      setTotal((t) => {
        const next = Math.max(0, t - 1);
        onCountChange?.(next);
        return next;
      });
    }

    window.addEventListener(COMMENT_ADDED_EVENT, onAdded);
    window.addEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
    window.addEventListener(COMMENT_FAILED_EVENT, onFailed);
    return () => {
      window.removeEventListener(COMMENT_ADDED_EVENT, onAdded);
      window.removeEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
      window.removeEventListener(COMMENT_FAILED_EVENT, onFailed);
    };
  }, [onCountChange, open, postId, sort]);

  // Escape closes panel
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

  const panelBody = (
    <>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">
          댓글 {total > 0 ? formatNumber(total) : ""}
        </h2>
        <div className="relative flex items-center gap-1">
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

      <p className="shrink-0 px-4 pt-2 text-xs text-white/45">{sortLabel}</p>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {loading && comments.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-300">{error}</p>
        ) : comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/50">
            아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.
          </p>
        ) : (
          <ul className="space-y-5">
            {comments.map((c) => (
              <li key={c.id} className={cn(c.pending && "opacity-70")}>
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Link
                        href={`/u/${c.author.username}`}
                        className="text-sm font-semibold text-white hover:underline"
                      >
                        <DisplayNameWithSupportTier
                          name={c.author.name || c.author.username}
                          tier={safeTier(c.author.supportTierSent)}
                          nameClassName="font-semibold text-sm text-white"
                          compact
                        />
                      </Link>
                    </div>
                    <TranslatableText
                      text={c.content}
                      as="p"
                      className="mt-1 text-sm leading-relaxed text-white/90 whitespace-pre-wrap"
                    />
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-white/45">
                      <button
                        type="button"
                        className="hover:text-white/80"
                        onClick={() =>
                          setReplyTo((cur) => (cur === c.id ? null : c.id))
                        }
                      >
                        답글
                      </button>
                    </div>

                    {c.replies.length > 0 && (
                      <ul className="mt-3 space-y-3 border-l border-white/10 pl-3">
                        {c.replies.map((r) => (
                          <li key={r.id}>
                            <Link
                              href={`/u/${r.author.username}`}
                              className="text-sm font-semibold text-white hover:underline"
                            >
                              {r.author.name || r.author.username}
                            </Link>
                            <TranslatableText
                              text={r.content}
                              as="p"
                              className="mt-0.5 text-sm text-white/85 whitespace-pre-wrap"
                            />
                          </li>
                        ))}
                      </ul>
                    )}

                    {replyTo === c.id && user && (
                      <CommentForm
                        postId={postId}
                        parentId={c.id}
                        placeholder="답글 추가..."
                        className="mt-3"
                        inputClassName="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {user ? (
          <CommentForm
            postId={postId}
            placeholder="댓글 추가..."
            className="mt-0"
            inputClassName="border-white/15 bg-white/5 text-white placeholder:text-white/40"
          />
        ) : (
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${postId}`)}`}
            className="flex h-10 items-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white/55"
          >
            댓글을 쓰려면 로그인하세요
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: YouTube-style right rail */}
      <aside
        className={cn(
          "pointer-events-auto relative z-[230] hidden h-full shrink-0 flex-col overflow-hidden border-l border-white/10 bg-neutral-950 text-white transition-[width,opacity,transform] duration-300 ease-out lg:flex",
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

      {/* Mobile: bottom sheet */}
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
            "pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[78dvh] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-950 text-white shadow-2xl transition-transform duration-300 ease-out",
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
