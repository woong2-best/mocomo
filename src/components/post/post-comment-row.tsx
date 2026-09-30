"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart, MoreHorizontal } from "lucide-react";
import { TranslatableText } from "@/components/ui/translatable-text";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { submitContentReport } from "@/actions/report";
import { blockUserAction } from "@/actions/user-relationship";
import type { SupportTierLevel } from "@prisma/client";
import { cn, formatNumber } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

export type PostCommentRowData = {
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
};

function safeTier(tier: string | null | undefined): SupportTierLevel {
  if (!tier) return "SEED";
  const allowed = [
    "SEED", "STONE", "BRONZE", "SILVER", "GOLD", "CRYSTAL",
    "EMERALD", "SAPPHIRE", "RUBY", "DIAMOND", "MYTHRIL", "ORICHALCUM",
    "LUNA", "TERRA", "JUPITER", "ASTRAL", "COSMIC",
  ];
  return allowed.includes(tier) ? (tier as SupportTierLevel) : "SEED";
}

export function PostCommentRow({
  comment,
  postId,
  showIdHandle = true,
  isReply = false,
  onLikeChange,
}: {
  comment: PostCommentRowData;
  postId: string;
  showIdHandle?: boolean;
  isReply?: boolean;
  onLikeChange?: (commentId: string, liked: boolean, likeCount: number) => void;
}) {
  const { locale, t } = useLocale();
  const session = useSession();
  const viewerId = session.data?.user?.id ?? null;
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    setLiked(comment.likedByMe);
    setLikeCount(comment.likeCount);
  }, [comment.id, comment.likedByMe, comment.likeCount]);

  const isMine = !!viewerId && comment.author.id === viewerId;
  const displayName = comment.author.name || comment.author.username;

  async function toggleLike() {
    if (!viewerId || likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !liked;
    const prevLiked = liked;
    const prevCount = likeCount;
    const optimisticCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setLikeCount(optimisticCount);
    onLikeChange?.(comment.id, nextLiked, optimisticCount);
    try {
      const res = await fetch(`/api/comments/${comment.id}/like`, {
        method: nextLiked ? "POST" : "DELETE",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        likeCount?: number;
        liked?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || uiText(locale, "실패", "Failed"));
      const finalLiked = !!body.liked;
      const finalCount =
        typeof body.likeCount === "number" ? body.likeCount : optimisticCount;
      setLiked(finalLiked);
      setLikeCount(finalCount);
      onLikeChange?.(comment.id, finalLiked, finalCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      onLikeChange?.(comment.id, prevLiked, prevCount);
    } finally {
      setLikeBusy(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/post/${postId}#comment-${comment.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
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
    window.alert(
      res.error ?? uiText(locale, "신고가 접수되었습니다.", "Report submitted.")
    );
  }

  async function block() {
    const res = await blockUserAction(comment.author.id, comment.author.username);
    if (res.error) {
      window.alert(res.error);
      return;
    }
    window.alert(uiText(locale, "차단되었습니다.", "User blocked."));
  }

  return (
    <div className={cn("flex gap-2", isReply && "ml-6 mt-2 pl-4 border-l border-border")}>
      <div className="min-w-0 flex-1">
        <DisplayNameWithSupportTier
          name={displayName}
          tier={safeTier(comment.author.supportTierSent)}
          nameClassName="font-medium text-sm"
          compact
          profileUsername={comment.author.username}
          idHandle={showIdHandle ? comment.author.username : undefined}
        />
        <TranslatableText
          text={comment.content}
          as="p"
          className="text-sm mt-1 whitespace-pre-wrap"
        />
        {likeCount > 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            {uiText(locale, `좋아요 ${formatNumber(likeCount)}개`, `${formatNumber(likeCount)} likes`)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {viewerId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={uiText(locale, "댓글 메뉴", "Comment menu")}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem onClick={() => void copyLink()}>{t("toast.copyLink")}</DropdownMenuItem>
              {!isMine ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void report()}>
                    {uiText(locale, "신고", "Report")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void block()}>
                    {uiText(locale, "차단", "Block")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <button
          type="button"
          className={cn(
            "inline-flex min-h-8 items-center justify-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-folk-terracotta hover:bg-muted/50",
            liked && "text-folk-terracotta",
            !viewerId && "opacity-50"
          )}
          aria-label={
            liked
              ? uiText(locale, "좋아요 취소", "Unlike")
              : uiText(locale, "좋아요", "Like")
          }
          aria-pressed={liked}
          disabled={!viewerId || likeBusy}
          onClick={() => void toggleLike()}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          <span className="tabular-nums">{formatNumber(likeCount)}</span>
        </button>
      </div>
    </div>
  );
}
