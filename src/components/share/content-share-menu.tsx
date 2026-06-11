"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Link2,
  MessageCircle,
  PenSquare,
  Share2,
  Video,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useComposeOptional } from "@/components/compose/compose-provider";
import { cn } from "@/lib/utils";

export type ContentShareMenuProps = {
  url: string;
  label: string;
  shareMessage: string;
  composeDraft: string;
  composeTitle?: string;
  nativeShareTitle: string;
  hasVideo?: boolean;
  size?: "sm" | "md" | "detail";
  tone?: "folk" | "plain";
  className?: string;
  onActionError?: (message: string) => void;
};

export function ContentShareMenu({
  url,
  label,
  shareMessage,
  composeDraft,
  composeTitle,
  nativeShareTitle,
  hasVideo = false,
  size = "sm",
  tone = "folk",
  className,
  onActionError,
}: ContentShareMenuProps) {
  const router = useRouter();
  const compose = useComposeOptional();
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
          menu: "border-folk-cobalt/20 bg-background/98",
          item: "focus:bg-folk-gold/10",
          icon: "bg-folk-cobalt/10 text-folk-cobalt",
        }
      : {
          menu: "border-violet-500/20 bg-background/95 backdrop-blur-md",
          item: "focus:bg-violet-500/10",
          icon: "bg-violet-500/10 text-violet-600",
        };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onActionError?.("링크 복사에 실패했습니다.");
    }
  }

  async function shareNative() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: nativeShareTitle,
          text: shareMessage,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      onActionError?.("공유에 실패했습니다.");
    }
  }

  function sendToChat() {
    router.push(
      `/messages/new?share=${encodeURIComponent(shareMessage)}&label=${encodeURIComponent(label)}`
    );
  }

  function postAsNew() {
    if (compose) {
      compose.openCompose({
        initialContent: composeDraft,
        initialTitle: composeTitle,
      });
      return;
    }
    router.push(
      `/compose?from=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : pathFromUrl(url))}&text=${encodeURIComponent(composeDraft)}&title=${encodeURIComponent(composeTitle ?? "")}`
    );
  }

  return (
    <DropdownMenu>
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
            <Check
              className={cn(iconClass, tone === "folk" ? "text-folk-forest" : "text-green-500")}
              strokeWidth={1.5}
            />
          ) : (
            <Share2 className={cn(iconClass, "pointer-events-none")} strokeWidth={1.5} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-56 rounded-2xl p-1.5 shadow-xl", accent.menu)}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            sendToChat();
          }}
          className={cn("rounded-xl py-2.5 gap-3", accent.item)}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              accent.icon
            )}
          >
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="font-medium">Chat으로 전송하기</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void copyLink();
          }}
          className={cn("rounded-xl py-2.5 gap-3", accent.item)}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              accent.icon
            )}
          >
            <Link2 className="h-4 w-4" />
          </span>
          <span className="font-medium">링크 복사하기</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void shareNative();
          }}
          className={cn("rounded-xl py-2.5 gap-3", accent.item)}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              accent.icon
            )}
          >
            <Share2 className="h-4 w-4" />
          </span>
          <span className="font-medium">게시물 공유하기</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            postAsNew();
          }}
          className={cn("rounded-xl py-2.5 gap-3", accent.item)}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              accent.icon
            )}
          >
            {hasVideo ? <Video className="h-4 w-4" /> : <PenSquare className="h-4 w-4" />}
          </span>
          <span className="font-medium">
            {hasVideo ? "동영상 게시하기" : "내 게시물로 올리기"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}
