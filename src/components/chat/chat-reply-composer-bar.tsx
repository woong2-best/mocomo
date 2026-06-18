"use client";

import { X } from "lucide-react";
import type { ChatMessageView } from "@/lib/chat-message-normalize";
import { getChatMessageReplyPreview } from "@/lib/chat-message-normalize";
import { Button } from "@/components/ui/button";

export function ChatReplyComposerBar({
  target,
  selfUserId,
  onCancel,
}: {
  target: ChatMessageView;
  selfUserId: string;
  onCancel: () => void;
}) {
  const isSelf = target.sender.id === selfUserId;
  const preview = getChatMessageReplyPreview(target);
  const thumb = target.attachments?.find((a) => a.type === "IMAGE" || a.type === "GIF");

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
      <div className="w-0.5 self-stretch min-h-[2.25rem] rounded-full bg-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-primary font-semibold">
            {isSelf ? "나" : target.sender.username}
          </span>
          에 답장
        </p>
        <p className="text-xs text-foreground/80 truncate">{preview}</p>
      </div>
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-full text-muted-foreground"
        onClick={onCancel}
        aria-label="답장 취소"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
