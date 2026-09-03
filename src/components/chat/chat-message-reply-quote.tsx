"use client";

import type { ChatMessageView } from "@/lib/chat-message-normalize";
import { getChatMessageReplyPreview } from "@/lib/chat-message-normalize";
import { cn } from "@/lib/utils";

export function ChatMessageReplyQuote({
  replyTo,
  isMine,
  selfUserId,
  compact,
}: {
  replyTo: NonNullable<ChatMessageView["replyTo"]>;
  isMine: boolean;
  selfUserId: string;
  compact?: boolean;
}) {
  const isReplyToSelf = replyTo.sender.id === selfUserId;
  const preview = getChatMessageReplyPreview(replyTo);
  // Paid media never renders outside the forensic canvas, not even as a
  // reply thumbnail.
  const thumb = replyTo.attachments?.find(
    (a) => (a.type === "IMAGE" || a.type === "GIF") && !(a.priceKrw ?? 0) && Boolean(a.url)
  );

  return (
    <div
      className={cn(
        "flex gap-2 mb-1.5 pb-1.5 border-b",
        isMine ? "border-primary-foreground/20" : "border-border/50"
      )}
    >
      <div
        className={cn(
          "w-0.5 shrink-0 rounded-full self-stretch min-h-[2rem]",
          isReplyToSelf
            ? isMine
              ? "bg-primary-foreground/50"
              : "bg-muted-foreground/40"
            : isMine
              ? "bg-primary-foreground/70"
              : "bg-primary"
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[11px] font-semibold leading-tight truncate",
            isReplyToSelf
              ? isMine
                ? "text-primary-foreground/80"
                : "text-muted-foreground"
              : isMine
                ? "text-primary-foreground"
                : "text-primary"
          )}
        >
          {isReplyToSelf ? "나" : replyTo.sender.username}
        </p>
        <p
          className={cn(
            "text-[12px] leading-snug truncate",
            compact ? "max-w-[10rem]" : "max-w-[14rem]",
            isMine ? "text-primary-foreground/75" : "text-muted-foreground"
          )}
        >
          {preview}
        </p>
      </div>
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb.url}
          alt=""
          className="h-9 w-9 shrink-0 rounded-md object-cover"
        />
      )}
    </div>
  );
}
