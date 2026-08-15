"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Link2, MessageSquare } from "lucide-react";
import { ShareGlobeIcon } from "@/components/ui/share-globe-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareToMessageDialog } from "@/components/share/share-to-message-dialog";
import { usePublishedToastOptional } from "@/components/providers/published-toast-provider";
import { cn } from "@/lib/utils";

export type ContentShareMenuProps = {
  url: string;
  shareMessage: string;
  /** When set, DM share sends a rich post card instead of plain text */
  postId?: string;
  size?: "sm" | "md" | "detail";
  tone?: "folk" | "plain";
  className?: string;
  onActionError?: (message: string) => void;
};

export function ContentShareMenu({
  url,
  shareMessage,
  postId,
  size = "sm",
  tone = "folk",
  className,
  onActionError,
}: ContentShareMenuProps) {
  const router = useRouter();
  const session = useSession();
  const publishedToast = usePublishedToastOptional();
  const [open, setOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const iconClass =
    size === "md" ? "h-6 w-6" : size === "detail" ? "h-4 w-4" : "h-3.5 w-3.5";
  const buttonClass =
    size === "md"
      ? "min-h-9 hover:opacity-70 flex items-center justify-center"
      : size === "detail"
        ? "hover:text-foreground min-h-9 px-1 flex items-center justify-center"
        : "hover:text-foreground min-h-8 min-w-8 flex items-center justify-center";

  const accent =
    tone === "folk"
      ? {
          menu: "border-folk-cobalt/30 bg-folk-cream shadow-folk",
          item: "focus:bg-folk-gold/20 rounded-xl py-2.5",
          icon: "text-folk-cobalt",
          check: "text-folk-forest",
        }
      : {
          menu: "border-border bg-background shadow-xl",
          item: "focus:bg-muted rounded-xl py-2.5",
          icon: "text-violet-600",
          check: "text-green-500",
        };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      setOpen(false);
    } catch {
      onActionError?.("링크 복사에 실패했습니다.");
    }
  }

  function sendToMessage() {
    const status = session?.status;
    if (status === "loading") return;
    if (status !== "authenticated") {
      setOpen(false);
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`);
      return;
    }
    setOpen(false);
    setDmOpen(true);
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen} modal>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(buttonClass, className)}
            aria-label={copied ? "링크 복사됨" : "공유"}
            title={copied ? "링크 복사됨" : "공유"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {copied ? (
              <Check className={cn(iconClass, accent.check)} strokeWidth={1.5} />
            ) : (
              <ShareGlobeIcon className={iconClass} />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          sideOffset={10}
          collisionPadding={12}
          className={cn("z-[220] w-44 rounded-2xl border-2 p-1.5", accent.menu)}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              sendToMessage();
            }}
            className={cn("gap-3 font-medium cursor-pointer", accent.item)}
          >
            <MessageSquare className={cn("h-4 w-4 shrink-0", accent.icon)} />
            메세지 보내기
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void copyLink();
            }}
            className={cn("gap-3 font-medium cursor-pointer", accent.item)}
          >
            <Link2 className={cn("h-4 w-4 shrink-0", accent.icon)} />
            링크 복사하기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareToMessageDialog
        open={dmOpen}
        onOpenChange={setDmOpen}
        shareMessage={shareMessage}
        postId={postId}
        tone={tone}
        onBack={() => {
          setDmOpen(false);
          setOpen(true);
        }}
        onError={onActionError}
        onShared={(roomId) => {
          publishedToast?.showInfoToast({
            message: "게시물을 공유함",
            detail: "대화 보기",
            href: `/messages/${roomId}`,
            durationMs: 4500,
          });
        }}
      />
    </>
  );
}
