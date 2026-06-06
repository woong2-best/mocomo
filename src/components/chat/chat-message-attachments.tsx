"use client";

import { useState } from "react";
import type { ChatAttachmentView } from "@/lib/chat-attachments";
import { ChatVoiceMessage } from "@/components/chat/chat-voice-message";
import { cn } from "@/lib/utils";

function ChatImage({ url, alt, isMine }: { url: string; alt: string; isMine: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={cn(
          "px-3 py-4 text-center text-xs rounded-2xl",
          isMine ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        이미지를 불러올 수 없습니다.
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-1 underline"
        >
          링크로 열기
        </a>
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt}
      className="w-full h-auto max-h-72 object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function ChatMessageAttachments({
  attachments,
  isMine,
}: {
  attachments: ChatAttachmentView[];
  isMine: boolean;
}) {
  const images = attachments.filter((a) => a.type === "IMAGE" || a.type === "GIF");
  const audios = attachments.filter((a) => a.type === "AUDIO");
  const videos = attachments.filter((a) => a.type === "VIDEO");

  return (
    <div className="space-y-1.5">
      {audios.map((a) => (
        <ChatVoiceMessage key={a.id} url={a.url} isMine={isMine} />
      ))}

      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1 overflow-hidden rounded-2xl",
            isMine ? "rounded-br-md" : "rounded-bl-md",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {images.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block overflow-hidden border border-border/40 bg-black/5 max-w-[min(280px,72vw)]",
                isMine ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"
              )}
            >
              <ChatImage url={a.url} alt={a.name ?? "사진"} isMine={isMine} />
            </a>
          ))}
        </div>
      )}

      {videos.map((a) => (
        <video
          key={a.id}
          src={a.url}
          controls
          playsInline
          className={cn(
            "max-w-[min(280px,72vw)] rounded-2xl border border-border/40",
            isMine ? "rounded-br-md" : "rounded-bl-md"
          )}
        />
      ))}
    </div>
  );
}
