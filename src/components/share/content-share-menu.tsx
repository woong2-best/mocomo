"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  Link2,
  MessageCircle,
  PenSquare,
  Share2,
  Video,
  X,
} from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { useComposeOptional } from "@/components/compose/compose-provider";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
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

type ShareAction = {
  key: string;
  label: string;
  icon: ReactNode;
  run: () => void | Promise<void>;
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
  const [open, setOpen] = useState(false);
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
          sheet: "bg-folk-cream border-folk-cobalt/25",
          item: "hover:bg-folk-gold/15 active:bg-folk-gold/25",
          icon: "bg-folk-cobalt/10 text-folk-cobalt",
          title: "text-folk-cobalt",
        }
      : {
          sheet: "bg-background border-border",
          item: "hover:bg-muted/80 active:bg-muted",
          icon: "bg-violet-500/10 text-violet-600",
          title: "text-foreground",
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

  async function shareNative() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: nativeShareTitle,
          text: shareMessage,
          url,
        });
        setOpen(false);
        return;
      }
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      setOpen(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      onActionError?.("공유에 실패했습니다.");
    }
  }

  function sendToChat() {
    setOpen(false);
    router.push(
      `/messages/new?share=${encodeURIComponent(shareMessage)}&label=${encodeURIComponent(label)}`
    );
  }

  function postAsNew() {
    setOpen(false);
    if (compose) {
      compose.openCompose({
        initialContent: composeDraft,
        initialTitle: composeTitle,
      });
      return;
    }
    router.push(
      buildAptMailboxUrl({
        initialContent: composeDraft,
        initialTitle: composeTitle,
      })
    );
  }

  const actions: ShareAction[] = [
    {
      key: "chat",
      label: "Chat으로 전송하기",
      icon: <MessageCircle className="h-4 w-4" />,
      run: sendToChat,
    },
    {
      key: "copy",
      label: "링크 복사하기",
      icon: <Link2 className="h-4 w-4" />,
      run: copyLink,
    },
    {
      key: "share",
      label: "게시물 공유하기",
      icon: <Share2 className="h-4 w-4" />,
      run: shareNative,
    },
    {
      key: "compose",
      label: hasVideo ? "동영상 게시하기" : "내 게시물로 올리기",
      icon: hasVideo ? <Video className="h-4 w-4" /> : <PenSquare className="h-4 w-4" />,
      run: postAsNew,
    },
  ];

  return (
    <>
      <button
        type="button"
        className={cn(buttonClass, className)}
        aria-label={copied ? "링크 복사됨" : "공유"}
        title={copied ? "링크 복사됨" : "공유"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[200]" />
          <DialogPrimitive.Content
            className={cn(
              "fixed z-[201] w-[min(100vw-1.5rem,20rem)] outline-none",
              "left-1/2 bottom-4 -translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
              "rounded-2xl border-2 shadow-2xl p-0 overflow-hidden",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
              accent.sheet
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <DialogTitle className={cn("text-sm font-bold font-display", accent.title)}>
                공유
              </DialogTitle>
              <DialogPrimitive.Close
                type="button"
                className="rounded-full p-1.5 hover:bg-black/5"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            <ul className="p-1.5">
              {actions.map((action) => (
                <li key={action.key}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors",
                      accent.item
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void action.run();
                    }}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        accent.icon
                      )}
                    >
                      {action.icon}
                    </span>
                    <span className="min-w-0">{action.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}
