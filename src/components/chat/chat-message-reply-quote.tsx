"use client";

import type { ChatMessageView } from "@/lib/chat-message-normalize";
import { getQuotedMessageBody, getReplyToHeading } from "@/lib/chat-reply-ui";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function ChatMessageReplyQuote({
  replyTo,
  isMine,
  selfUserId,
  selfUsername,
  onJumpToOriginal,
}: {
  replyTo: NonNullable<ChatMessageView["replyTo"]>;
  isMine: boolean;
  selfUserId: string;
  selfUsername: string;
  onJumpToOriginal?: (messageId: string) => void;
}) {
  const { locale } = useLocale();
  const heading = getReplyToHeading(replyTo, {
    selfUserId,
    selfUsername,
    bubbleIsMine: isMine,
    locale,
  });
  const body = getQuotedMessageBody(replyTo, locale);
  const clickable = Boolean(onJumpToOriginal && replyTo.id);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onJumpToOriginal?.(replyTo.id)}
      className={cn(
        "w-full text-left pb-2 mb-2 border-b",
        isMine ? "border-primary-foreground/25" : "border-border/50",
        clickable && "cursor-pointer rounded-md -mx-1 px-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
        !clickable && "cursor-default"
      )}
    >
      <p
        className={cn(
          "text-[11px] leading-tight mb-1",
          isMine ? "text-primary-foreground/65" : "text-muted-foreground/90"
        )}
      >
        {heading}
      </p>
      {body.kind === "text" ? (
        <p
          className={cn(
            "text-[12px] leading-snug line-clamp-2",
            isMine ? "text-primary-foreground/85" : "text-foreground/80"
          )}
        >
          {body.text}
        </p>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          {body.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={body.thumbUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div
              className={cn(
                "h-9 w-9 shrink-0 rounded-md",
                isMine ? "bg-primary-foreground/20" : "bg-muted"
              )}
            />
          )}
          <p
            className={cn(
              "text-[12px] font-medium truncate",
              isMine ? "text-primary-foreground/85" : "text-foreground/80"
            )}
          >
            {body.label}
          </p>
        </div>
      )}
    </button>
  );
}
