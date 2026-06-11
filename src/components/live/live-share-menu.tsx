"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  MessageCircle,
  PenSquare,
  Share2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useComposeOptional } from "@/components/compose/compose-provider";
import {
  buildLivePostDraft,
  buildLiveShareMessage,
  liveWatchUrl,
} from "@/lib/live-share";
import { cn } from "@/lib/utils";

type LiveShareMenuProps = {
  channelId: string;
  channelName?: string;
  variant?: "button" | "icon";
  className?: string;
};

export function LiveShareMenu({
  channelId,
  channelName = "라이브",
  variant = "button",
  className,
}: LiveShareMenuProps) {
  const router = useRouter();
  const compose = useComposeOptional();
  const [feedback, setFeedback] = useState<string | null>(null);
  const url = liveWatchUrl(channelId);
  const shareMessage = buildLiveShareMessage(channelName, channelId);

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2200);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch {
      flash("error");
    }
  }

  async function sharePost() {
    const payload = {
      title: `${channelName} · MoCoMo 라이브`,
      text: shareMessage,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(`${shareMessage}`);
      flash("copied");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      flash("error");
    }
  }

  function sendToChat() {
    router.push(
      `/messages/new?share=${encodeURIComponent(shareMessage)}&label=${encodeURIComponent(channelName)}`
    );
  }

  function postToFeed() {
    const draft = buildLivePostDraft(channelName, channelId);
    if (compose) {
      compose.openCompose({ initialContent: draft, initialTitle: `${channelName} LIVE` });
      return;
    }
    router.push(
      `/compose?from=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : `/voice/${channelId}`)}&text=${encodeURIComponent(draft)}`
    );
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        className={cn(
          "h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white",
          className
        )}
        aria-label="공유"
      >
        {feedback === "copied" ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
      </button>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("rounded-lg gap-1 h-8 text-xs", className)}
      >
        {feedback === "copied" ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Share2 className="h-3.5 w-3.5" />
        )}
        {feedback === "copied" ? "복사됨" : feedback === "error" ? "실패" : "공유"}
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-2xl border-violet-500/20 bg-background/95 backdrop-blur-md p-1.5 shadow-xl"
      >
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            sendToChat();
          }}
          className="rounded-xl py-2.5 gap-3 focus:bg-violet-500/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="font-medium">Chat으로 전송하기</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void copyLink();
          }}
          className="rounded-xl py-2.5 gap-3 focus:bg-violet-500/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
            <Link2 className="h-4 w-4" />
          </span>
          <span className="font-medium">링크 복사하기</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void sharePost();
          }}
          className="rounded-xl py-2.5 gap-3 focus:bg-violet-500/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
            <Share2 className="h-4 w-4" />
          </span>
          <span className="font-medium">게시물 공유하기</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            postToFeed();
          }}
          className="rounded-xl py-2.5 gap-3 focus:bg-violet-500/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
            <PenSquare className="h-4 w-4" />
          </span>
          <span className="font-medium">동영상 게시하기</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
