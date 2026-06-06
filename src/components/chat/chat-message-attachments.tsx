"use client";

import { useState } from "react";
import type { ChatAttachmentView } from "@/lib/chat-attachments";
import { cn } from "@/lib/utils";

function ChatImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground bg-muted/50">
        이미지를 불러올 수 없습니다.
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1 text-primary underline">
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
    <div className="space-y-2">
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1 overflow-hidden",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {images.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden border border-border/40 bg-black/5 max-w-[min(280px,72vw)]"
            >
              <ChatImage url={a.url} alt={a.name ?? "사진"} />
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
          className="max-w-[min(280px,72vw)] rounded-xl border border-border/40"
        />
      ))}
      {audios.map((a) => (
        <audio
          key={a.id}
          src={a.url}
          controls
          preload="metadata"
          className={cn(
            "w-full max-w-[min(280px,72vw)] h-10 rounded-full",
            isMine && "[color-scheme:light]"
          )}
        />
      ))}
    </div>
  );
}
