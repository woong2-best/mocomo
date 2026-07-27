"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  Heart,
  Loader2,
  MoreHorizontal,
  Pin,
  X,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CommentForm } from "@/components/post/comment-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COMMENT_ADDED_EVENT,
  COMMENT_CONFIRMED_EVENT,
  COMMENT_FAILED_EVENT,
  COMMENT_REMOVED_EVENT,
  COMMENT_UPDATED_EVENT,
  type OptimisticComment,
} from "@/lib/comment-optimistic-sync";
import { needsTranslation } from "@/lib/text-language";
import { useLocale } from "@/components/providers/locale-provider";
import { submitContentReport } from "@/actions/report";
import { blockUserAction } from "@/actions/user-relationship";
import { suspendUserTemporary } from "@/actions/admin";
import type { SerializedComment, SerializedReply } from "@/lib/comment-service";

type SortId = "popular" | "newest" | "oldest";

type PanelComment = SerializedComment & {
  pending?: boolean;
  parentId?: string | null;
};

type Props = {
  open: boolean;
  postId: string;
  initialCount?: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "popular", label: "인기 댓글" },
  { id: "newest", label: "최신순" },
  { id: "oldest", label: "오래된순" },
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

function SkeletonRows() {
  return (
    <ul className="space-y-5 py-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex animate-pulse gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-28 rounded bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-white/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AuthorBadge() {
  return (
    <span className="ml-1 inline-flex items-center rounded bg-white/15 px-1 py-px text-[10px] font-medium text-white/80">
      작성자
    </span>
  );
}

function CommentMenu({
  comment,
  isReply,
  postId,
  viewerId,
  isPostOwner,
  isAdmin,
  onEdit,
  onDeleted,
  onPinnedChange,
}: {
  comment: PanelComment | SerializedReply;
  isReply?: boolean;
  postId: string;
  viewerId: string | null;
  isPostOwner: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDeleted: () => void;
  onPinnedChange: (pinned: boolean) => void;
}) {
  const isMine = !!viewerId && comment.author.id === viewerId;
  const canPin = !isReply && (isPostOwner || isAdmin);
  const canDelete = isMine || isPostOwner || isAdmin;
  const isPinned = "isPinned" in comment && comment.isPinned;

  async function copyLink() {
    const url = `${window.location.origin}/post/${postId}#comment-${comment.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  async function pin(next: boolean) {
    const res = await fetch(`/api/comments/${comment.id}/pin`, {
      method: next ? "POST" : "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(typeof body.error === "string" ? body.error : "고정에 실패했습니다.");
      return;
    }
    onPinnedChange(next);
  }

  async function remove() {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    const hard = isAdmin && !isMine ? "?hard=1" : "";
    const res = await fetch(`/api/comments/${comment.id}${hard}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(typeof body.error === "string" ? body.error : "삭제에 실패했습니다.");
      return;
    }
    onDeleted();
  }

  async function hide() {
    if (!window.confirm("이 댓글을 숨길까요?")) return;
    const res = await fetch(`/api/comments/${comment.id}/hide`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(typeof body.error === "string" ? body.error : "숨기기에 실패했습니다.");
      return;
    }
    onDeleted();
  }

  async function report() {
    const res = await submitContentReport({
      targetType: "COMMENT",
      targetId: comment.id,
      reason: "SPAM",
      reportedUserId: comment.author.id,
      postId,
      commentId: comment.id,
    });
    window.alert(res.error ?? "신고가 접수되었습니다.");
  }

  async function block() {
    if (!window.confirm(`@${comment.author.username} 님을 차단할까요?`)) return;
    const res = await blockUserAction(comment.author.id, comment.author.username);
    window.alert(res.error ?? "차단되었습니다.");
  }

  async function sanction() {
    if (!window.confirm(`@${comment.author.username} 계정을 7일 제재할까요?`)) return;
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await suspendUserTemporary(
      comment.author.id,
      "댓글 관리자 제재",
      until
    );
    window.alert("계정 제재를 적용했습니다.");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/35 hover:bg-white/10 hover:text-white/70"
          aria-label="댓글 메뉴"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem] border-white/10 bg-neutral-900 text-white"
      >
        {canPin && (
          <DropdownMenuItem
            className="focus:bg-white/10"
            onClick={() => void pin(!isPinned)}
          >
            {isPinned ? "고정 해제" : "고정"}
          </DropdownMenuItem>
        )}
        {isMine && (
          <DropdownMenuItem className="focus:bg-white/10" onClick={onEdit}>
            수정
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem
            className="text-red-300 focus:bg-white/10 focus:text-red-200"
            onClick={() => void remove()}
          >
            삭제
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="focus:bg-white/10" onClick={() => void copyLink()}>
          링크 복사
        </DropdownMenuItem>
        {!isMine && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="focus:bg-white/10" onClick={() => void report()}>
              신고
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-white/10" onClick={() => void block()}>
              차단
            </DropdownMenuItem>
          </>
        )}
        {isAdmin && !isMine && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="focus:bg-white/10" onClick={() => void hide()}>
              숨김
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-300 focus:bg-white/10 focus:text-red-200"
              onClick={() => void sanction()}
            >
              계정 제재
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommentRow({
  comment,
  postId,
  viewerId,
  postAuthorId,
  isPostOwner,
  isAdmin,
  isReply,
  onPatch,
  onRemove,
}: {
  comment: PanelComment | SerializedReply;
  postId: string;
  viewerId: string | null;
  postAuthorId: string | null;
  isPostOwner: boolean;
  isAdmin: boolean;
  isReply?: boolean;
  onPatch: (id: string, patch: Partial<PanelComment>) => void;
  onRemove: (id: string) => void;
}) {
  const { locale, t } = useLocale();
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<SerializedReply[]>(
    "replies" in comment ? comment.replies : []
  );
  const [replyCursor, setReplyCursor] = useState<string | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [trLoading, setTrLoading] = useState(false);

  useEffect(() => {
    if ("replies" in comment && comment.replies.length > replies.length) {
      setReplies(comment.replies);
    }
  }, [comment, replies.length]);

  const needsTr = useMemo(
    () => needsTranslation(comment.content, locale),
    [comment.content, locale]
  );
  const display = showTranslated && translated ? translated : comment.content;
  const replyCount = "replyCount" in comment ? comment.replyCount : 0;
  const isPinned = "isPinned" in comment && comment.isPinned;
  const liked = comment.likedByMe;
  const likeCount = comment.likeCount;

  async function toggleLike() {
    if (!viewerId || likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !liked;
    onPatch(comment.id, {
      likedByMe: nextLiked,
      likeCount: Math.max(0, likeCount + (nextLiked ? 1 : -1)),
      likedByAuthor:
        nextLiked && viewerId === postAuthorId
          ? true
          : !nextLiked && viewerId === postAuthorId
            ? false
            : comment.likedByAuthor,
    });
    try {
      const res = await fetch(`/api/comments/${comment.id}/like`, {
        method: nextLiked ? "POST" : "DELETE",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        likeCount?: number;
        liked?: boolean;
        likedByAuthor?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "실패");
      onPatch(comment.id, {
        likedByMe: !!body.liked,
        likeCount:
          typeof body.likeCount === "number" ? body.likeCount : likeCount,
        likedByAuthor: !!body.likedByAuthor || (comment.likedByAuthor && nextLiked),
      });
    } catch {
      onPatch(comment.id, {
        likedByMe: liked,
        likeCount,
        likedByAuthor: comment.likedByAuthor,
      });
    } finally {
      setLikeBusy(false);
    }
  }

  async function loadReplies(reset = false) {
    if (loadingReplies) return;
    setLoadingReplies(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (!reset && replyCursor) qs.set("cursor", replyCursor);
      const res = await fetch(
        `/api/comments/${comment.id}/replies?${qs.toString()}`,
        { credentials: "include" }
      );
      const body = (await res.json()) as {
        replies?: SerializedReply[];
        nextCursor?: string | null;
      };
      if (!res.ok) return;
      setReplies((prev) =>
        reset ? body.replies ?? [] : [...prev, ...(body.replies ?? [])]
      );
      setReplyCursor(body.nextCursor ?? null);
      setExpanded(true);
    } finally {
      setLoadingReplies(false);
    }
  }

  async function saveEdit() {
    const text = editText.trim();
    if (!text) return;
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(typeof body.error === "string" ? body.error : "수정 실패");
      return;
    }
    onPatch(comment.id, { content: text, isEdited: true });
    setEditing(false);
  }

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
    <li
      id={`comment-${comment.id}`}
      className={cn(
        "flex gap-3 transition-opacity duration-200",
        "pending" in comment && comment.pending && "opacity-60"
      )}
    >
      <Link href={`/u/${comment.author.username}`} className="shrink-0 self-start">
        <Avatar className="!h-8 !w-8 !rounded-full !ring-0">
          <AvatarImage src={comment.author.image ?? undefined} alt="" className="!rounded-full" />
          <AvatarFallback className="!rounded-full bg-neutral-700 text-[11px] text-white">
            {(comment.author.name || comment.author.username).slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1 pr-1">
            {isPinned && (
              <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-white/45">
                <Pin className="h-3 w-3" />
                고정됨
              </p>
            )}
            <p className="text-[13px] leading-snug">
              <Link
                href={`/u/${comment.author.username}`}
                className="font-semibold text-white hover:text-white/90"
              >
                {comment.author.username}
              </Link>
              {comment.isPostAuthor ? <AuthorBadge /> : null}
              <span className="ml-1.5 text-white/40 tabular-nums">
                {formatRelativeKo(comment.createdAt)}
              </span>
              {comment.isEdited ? (
                <span className="ml-1 text-white/30">(수정됨)</span>
              ) : null}
            </p>

            {editing ? (
              <div className="mt-1 space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-[13px] text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black"
                    onClick={() => void saveEdit()}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    className="rounded-full px-3 py-1 text-xs text-white/60"
                    onClick={() => {
                      setEditing(false);
                      setEditText(comment.content);
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-0.5 text-[13px] leading-snug whitespace-pre-wrap break-words text-white">
                {display}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            {viewerId ? (
              <CommentMenu
                comment={comment}
                isReply={isReply}
                postId={postId}
                viewerId={viewerId}
                isPostOwner={isPostOwner}
                isAdmin={isAdmin}
                onEdit={() => {
                  setEditText(comment.content);
                  setEditing(true);
                }}
                onDeleted={() => onRemove(comment.id)}
                onPinnedChange={(pinned) =>
                  onPatch(comment.id, {
                    isPinned: pinned,
                    pinnedAt: pinned ? new Date().toISOString() : null,
                  })
                }
              />
            ) : null}
            <button
              type="button"
              className="p-1 text-white/45 transition-transform active:scale-90 hover:text-white"
              aria-label={liked ? "좋아요 취소" : "좋아요"}
              aria-pressed={liked}
              disabled={!viewerId || likeBusy}
              onClick={() => void toggleLike()}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  liked && "fill-red-500 text-red-500"
                )}
              />
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/40">
          {likeCount > 0 && (
            <span className="tabular-nums">좋아요 {formatNumber(likeCount)}개</span>
          )}
          {comment.likedByAuthor && (
            <span className="text-amber-300/80">작성자가 좋아함</span>
          )}
          {viewerId && (
            <button
              type="button"
              className="hover:text-white/70"
              onClick={() => setReplyOpen((v) => !v)}
            >
              답글 달기
            </button>
          )}
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

        {!isReply && replyCount > 0 && (
          <button
            type="button"
            className="mt-2 flex items-center gap-2 text-[12px] text-white/40 hover:text-white/65"
            onClick={() => {
              if (expanded) {
                setExpanded(false);
                return;
              }
              if (replies.length === 0) void loadReplies(true);
              else setExpanded(true);
            }}
          >
            <span className="inline-block h-px w-6 bg-white/30" aria-hidden />
            {expanded
              ? "답글 숨기기"
              : `답글 ${formatNumber(replyCount)}개 모두 보기`}
          </button>
        )}

        {!isReply && expanded && (
          <ul className="mt-2 space-y-0">
            {replies.map((r) => (
              <div key={r.id} className="mt-3">
                <CommentRow
                  comment={r}
                  postId={postId}
                  viewerId={viewerId}
                  postAuthorId={postAuthorId}
                  isPostOwner={isPostOwner}
                  isAdmin={isAdmin}
                  isReply
                  onPatch={(id, patch) => {
                    setReplies((prev) =>
                      prev.map((x) => (x.id === id ? { ...x, ...patch } : x))
                    );
                    onPatch(id, patch);
                  }}
                  onRemove={(id) => {
                    setReplies((prev) => prev.filter((x) => x.id !== id));
                    onRemove(id);
                  }}
                />
              </div>
            ))}
            {replyCursor && (
              <button
                type="button"
                className="mt-2 text-[12px] text-white/40 hover:text-white/70"
                disabled={loadingReplies}
                onClick={() => void loadReplies(false)}
              >
                {loadingReplies ? "불러오는 중…" : "답글 더 보기"}
              </button>
            )}
          </ul>
        )}

        {replyOpen && viewerId && (
          <CommentForm
            postId={postId}
            parentId={comment.id}
            placeholder="답글 달기..."
            autoFocus
            className="mt-2"
            inputClassName="h-9 rounded-full border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
            onSubmitted={() => {
              setReplyOpen(false);
              setExpanded(true);
            }}
          />
        )}
      </div>
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
  const viewerId = user?.id ?? null;
  const isAdmin = !!user?.isOperator || user?.role === "ADMIN";

  const [sort, setSort] = useState<SortId>("popular");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [pinned, setPinned] = useState<PanelComment[]>([]);
  const [comments, setComments] = useState<PanelComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(initialCount);
  const [postAuthorId, setPostAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const totalRef = useRef(total);
  totalRef.current = total;

  const isPostOwner = !!viewerId && !!postAuthorId && viewerId === postAuthorId;

  const notifyCount = useCallback((next: number) => {
    if (totalRef.current === next) return;
    totalRef.current = next;
    setTotal(next);
    onCountChangeRef.current?.(next);
  }, []);

  const mergeUnique = useCallback((base: PanelComment[], extra: PanelComment[]) => {
    const seen = new Set(base.map((c) => c.id));
    const out = [...base];
    for (const c of extra) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    return out;
  }, []);

  const loadPage = useCallback(
    async (opts: { reset: boolean; cursor?: string | null }) => {
      if (opts.reset) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }
      try {
        const qs = new URLSearchParams({
          sort,
          limit: "20",
        });
        if (opts.cursor) qs.set("cursor", opts.cursor);
        const res = await fetch(
          `/api/posts/${encodeURIComponent(postId)}/comments?${qs}`,
          { credentials: "include" }
        );
        const body = (await res.json().catch(() => ({}))) as {
          pinned?: PanelComment[];
          comments?: PanelComment[];
          nextCursor?: string | null;
          total?: number;
          postAuthorId?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error || "댓글을 불러오지 못했습니다.");

        if (typeof body.postAuthorId === "string") {
          setPostAuthorId(body.postAuthorId);
        }
        if (opts.reset) {
          setPinned(body.pinned ?? []);
          setComments(body.comments ?? []);
        } else {
          setComments((prev) => mergeUnique(prev, body.comments ?? []));
        }
        setNextCursor(body.nextCursor ?? null);
        if (typeof body.total === "number") notifyCount(body.total);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "댓글을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [mergeUnique, notifyCount, postId, sort]
  );

  useEffect(() => {
    if (!open || !postId) return;
    setPinned([]);
    setComments([]);
    setNextCursor(null);
    setTotal(initialCount);
    totalRef.current = initialCount;
    void loadPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId, sort]);

  useEffect(() => {
    if (!open) setSortMenuOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || !nextCursor || loadingMore || loading) return;
    const el = sentinelRef.current;
    const root = listRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadPage({ reset: false, cursor: nextCursor });
        }
      },
      { root, rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, nextCursor, loadingMore, loading, loadPage]);

  const patchComment = useCallback((id: string, patch: Partial<PanelComment>) => {
    const apply = (list: PanelComment[]) =>
      list.map((c) => {
        if (c.id === id) return { ...c, ...patch };
        if (c.replies?.some((r) => r.id === id)) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === id ? { ...r, ...patch } : r
            ),
          };
        }
        return c;
      });

    setPinned((prev) => {
      const next = apply(prev);
      // Move between pinned/unpinned buckets when pin flag changes
      if ("isPinned" in patch) {
        const target = [...prev, ...comments].find((c) => c.id === id);
        if (target) {
          if (patch.isPinned) {
            const row = { ...target, ...patch, isPinned: true };
            setComments((cs) => cs.filter((c) => c.id !== id));
            return mergeUnique(
              next.filter((c) => c.id !== id),
              [row]
            ).slice(0, 3);
          }
          const row = { ...target, ...patch, isPinned: false, pinnedAt: null };
          setComments((cs) => [row, ...cs.filter((c) => c.id !== id)]);
          return next.filter((c) => c.id !== id);
        }
      }
      return next;
    });
    setComments((prev) => apply(prev));
  }, [comments, mergeUnique]);

  const removeComment = useCallback(
    (id: string) => {
      setPinned((prev) => prev.filter((c) => c.id !== id));
      setComments((prev) =>
        prev
          .filter((c) => c.id !== id)
          .map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== id),
            replyCount: c.replies.some((r) => r.id === id)
              ? Math.max(0, c.replyCount - 1)
              : c.replyCount,
          }))
      );
      notifyCount(Math.max(0, totalRef.current - 1));
    },
    [notifyCount]
  );

  useEffect(() => {
    if (!open || !postId) return;

    function onAdded(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; comment: OptimisticComment }>)
        .detail;
      if (!detail || detail.postId !== postId) return;
      const c = detail.comment;
      const author = {
        id: c.author.id ?? viewerId ?? "",
        name: c.author.name,
        username: c.author.username,
        image: c.author.image ?? user?.image ?? null,
        supportTierSent: c.author.supportTierSent,
      };

      if (c.parentId) {
        const bump = (list: PanelComment[]) =>
          list.map((row) =>
            row.id === c.parentId
              ? {
                  ...row,
                  replyCount: row.replyCount + 1,
                  replies: [
                    ...row.replies,
                    {
                      id: c.id,
                      content: c.content,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      likeCount: 0,
                      likedByMe: false,
                      likedByAuthor: false,
                      isPostAuthor: author.id === postAuthorId,
                      isEdited: false,
                      author,
                    },
                  ],
                }
              : row
          );
        setPinned(bump);
        setComments(bump);
      } else {
        const row: PanelComment = {
          id: c.id,
          content: c.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pending: c.pending,
          likeCount: 0,
          likedByMe: false,
          likedByAuthor: false,
          isPostAuthor: author.id === postAuthorId,
          isPinned: false,
          pinnedAt: null,
          isEdited: false,
          replyCount: 0,
          author,
          replies: [],
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
      const swap = (list: PanelComment[]) =>
        list.map((c) => {
          if (c.id === detail.pendingId) {
            return { ...c, id: detail.realId, pending: false };
          }
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === detail.pendingId
                ? { ...r, id: detail.realId }
                : r
            ),
          };
        });
      setPinned(swap);
      setComments(swap);
    }

    function onFailed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string }>).detail;
      if (!detail || detail.postId !== postId) return;
      removeComment(detail.pendingId);
    }

    function onUpdated(e: Event) {
      const detail = (
        e as CustomEvent<{ postId: string; commentId: string; content: string }>
      ).detail;
      if (!detail || detail.postId !== postId) return;
      patchComment(detail.commentId, { content: detail.content, isEdited: true });
    }

    function onRemoved(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; commentId: string }>).detail;
      if (!detail || detail.postId !== postId) return;
      removeComment(detail.commentId);
    }

    window.addEventListener(COMMENT_ADDED_EVENT, onAdded);
    window.addEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
    window.addEventListener(COMMENT_FAILED_EVENT, onFailed);
    window.addEventListener(COMMENT_UPDATED_EVENT, onUpdated);
    window.addEventListener(COMMENT_REMOVED_EVENT, onRemoved);
    return () => {
      window.removeEventListener(COMMENT_ADDED_EVENT, onAdded);
      window.removeEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
      window.removeEventListener(COMMENT_FAILED_EVENT, onFailed);
      window.removeEventListener(COMMENT_UPDATED_EVENT, onUpdated);
      window.removeEventListener(COMMENT_REMOVED_EVENT, onRemoved);
    };
  }, [
    notifyCount,
    open,
    patchComment,
    postAuthorId,
    postId,
    removeComment,
    sort,
    user?.image,
    viewerId,
  ]);

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
  const allComments = [...pinned, ...comments];
  const empty = !loading && !error && allComments.length === 0;

  const panelBody: ReactNode = (
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

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-1"
      >
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-300">{error}</p>
        ) : empty ? (
          <p className="py-10 text-center text-sm text-white/45">
            아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.
          </p>
        ) : (
          <ul className="space-y-5 pb-4">
            {allComments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                postId={postId}
                viewerId={viewerId}
                postAuthorId={postAuthorId}
                isPostOwner={isPostOwner}
                isAdmin={isAdmin}
                onPatch={patchComment}
                onRemove={removeComment}
              />
            ))}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            )}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        {user ? (
          <CommentForm
            postId={postId}
            placeholder="댓글 추가..."
            className="mt-0"
            inputClassName="rounded-full border-white/15 bg-transparent text-white placeholder:text-white/35"
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
