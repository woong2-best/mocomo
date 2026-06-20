"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Repeat2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useComposeOptional } from "@/components/compose/compose-provider";
import { postEngage } from "@/lib/post-engage-client";
import { buildPostRepostQuoteDraft } from "@/lib/post-share";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { cn, formatNumber } from "@/lib/utils";

type PostRepostMenuProps = {
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
  initialReposted?: boolean;
  repostCount?: number;
  size?: "sm" | "md" | "detail";
  tone?: "folk" | "plain";
  requireLogin: () => boolean;
  onActionError?: (message: string) => void;
  formatCount?: (n: number) => string;
};

export function PostRepostMenu({
  postId,
  authorUsername,
  title,
  content,
  initialReposted = false,
  repostCount: initialRepostCount = 0,
  size = "sm",
  tone = "folk",
  requireLogin,
  onActionError,
  formatCount,
}: PostRepostMenuProps) {
  const router = useRouter();
  const compose = useComposeOptional();
  const [open, setOpen] = useState(false);
  const [reposted, setReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);
  const [busy, setBusy] = useState(false);

  const iconClass =
    size === "md" ? "h-6 w-6" : size === "detail" ? "h-4 w-4" : "h-3.5 w-3.5";
  const buttonClass =
    size === "md"
      ? "flex items-center gap-1.5 min-h-9 hover:opacity-70"
      : size === "detail"
        ? "flex items-center gap-1 min-h-9 px-1"
        : "flex items-center gap-0.5 min-h-8 min-w-8 justify-center";

  const accent =
    tone === "folk"
      ? {
          menu: "border-folk-cobalt/30 bg-folk-cream shadow-folk",
          item: "focus:bg-folk-gold/20 rounded-xl py-2.5",
          icon: "text-folk-forest",
          active: "text-folk-forest",
          hover: "hover:text-folk-forest",
        }
      : {
          menu: "border-border bg-background shadow-xl",
          item: "focus:bg-muted rounded-xl py-2.5",
          icon: "text-green-500",
          active: "text-green-500",
          hover: "hover:opacity-70",
        };

  const countLabel = formatCount
    ? formatCount(repostCount)
    : formatNumber(repostCount);

  async function toggleRepost() {
    if (!requireLogin() || busy) return;
    setOpen(false);
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!reposted);
    setRepostCount((c) => (reposted ? Math.max(0, c - 1) : c + 1));
    setBusy(true);
    try {
      const data = await postEngage(postId, "repost");
      setReposted(!!data.reposted);
      if (typeof data.repostCount === "number") setRepostCount(data.repostCount);
    } catch (err) {
      setReposted(prevReposted);
      setRepostCount(prevCount);
      onActionError?.(err instanceof Error ? err.message : "재게시에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function quotePost() {
    if (!requireLogin()) return;
    setOpen(false);
    const quoteBlock = buildPostRepostQuoteDraft({
      postId,
      authorUsername,
      title,
      content,
    });
    const preview = title?.trim() || content?.trim().slice(0, 40) || "게시물";
    if (compose) {
      compose.openCompose({
        initialContent: quoteBlock,
        initialTitle: `@${authorUsername} 인용`,
      });
      return;
    }
    router.push(
      buildAptMailboxUrl({
        initialContent: quoteBlock,
        initialTitle: `@${authorUsername} 인용`,
      })
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className={cn(
            buttonClass,
            reposted ? accent.active : accent.hover
          )}
          aria-label="재게시"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Repeat2 className={cn(iconClass, "pointer-events-none")} strokeWidth={1.5} />
          {(size === "sm" || size === "detail") && (
            <span className="pointer-events-none tabular-nums">{countLabel}</span>
          )}
          {size === "md" && repostCount > 0 && (
            <span className="text-sm font-medium tabular-nums pointer-events-none">
              {countLabel}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="center"
        sideOffset={10}
        collisionPadding={12}
        className={cn(
          "z-[220] w-44 rounded-2xl border-2 p-1.5",
          accent.menu
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void toggleRepost();
          }}
          className={cn("gap-3 font-medium cursor-pointer", accent.item)}
        >
          <Repeat2 className={cn("h-4 w-4 shrink-0", accent.icon)} />
          {reposted ? "재게시 취소" : "재게시"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            quotePost();
          }}
          className={cn("gap-3 font-medium cursor-pointer", accent.item)}
        >
          <PenLine className="h-4 w-4 shrink-0 text-folk-cobalt" />
          인용하세요
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
