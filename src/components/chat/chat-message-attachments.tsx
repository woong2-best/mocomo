"use client";

import { useState } from "react";
import type { ChatAttachmentView } from "@/lib/chat-attachments";
import { ChatVoiceMessage } from "@/components/chat/chat-voice-message";
import { LockedMediaPaywallOverlay } from "@/components/media/locked-media-paywall-overlay";
import { PurchaseMessageMediaButton } from "@/components/chat/purchase-message-media-button";
import { cn } from "@/lib/utils";

function ChatImage({
  attachment,
  alt,
  isMine,
  sellerUsername,
  onPurchaseSuccess,
}: {
  attachment: ChatAttachmentView;
  alt: string;
  isMine: boolean;
  sellerUsername?: string;
  onPurchaseSuccess?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const locked = attachment.locked || (!attachment.url && (attachment.priceKrw ?? 0) > 0);

  if (locked) {
    return (
      <div
        className={cn(
          "relative block overflow-hidden border border-border/40 bg-muted max-w-[min(280px,72vw)] min-h-[180px]",
          isMine ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"
        )}
      >
        <LockedMediaPaywallOverlay>
          <PurchaseMessageMediaButton
            attachmentId={attachment.id}
            priceKrw={attachment.priceKrw ?? 0}
            sellerUsername={sellerUsername}
            onPurchaseSuccess={onPurchaseSuccess}
          />
        </LockedMediaPaywallOverlay>
      </div>
    );
  }

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
          href={attachment.url}
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
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block overflow-hidden border border-border/40 bg-black/5 max-w-[min(280px,72vw)]",
        isMine ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.url}
        alt={alt}
        className="w-full h-auto max-h-72 object-cover"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

export function ChatMessageAttachments({
  attachments,
  isMine,
  sellerUsername,
  onPurchaseSuccess,
}: {
  attachments: ChatAttachmentView[];
  isMine: boolean;
  sellerUsername?: string;
  onPurchaseSuccess?: () => void;
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
            <ChatImage
              key={a.id}
              attachment={a}
              alt={a.name ?? "사진"}
              isMine={isMine}
              sellerUsername={sellerUsername}
              onPurchaseSuccess={onPurchaseSuccess}
            />
          ))}
        </div>
      )}

      {videos.map((a) => {
        const locked = a.locked || (!a.url && (a.priceKrw ?? 0) > 0);
        if (locked) {
          return (
            <div
              key={a.id}
              className={cn(
                "relative max-w-[min(280px,72vw)] min-h-[180px] rounded-2xl border border-border/40 bg-muted overflow-hidden",
                isMine ? "rounded-br-md" : "rounded-bl-md"
              )}
            >
              <LockedMediaPaywallOverlay>
                <PurchaseMessageMediaButton
                  attachmentId={a.id}
                  priceKrw={a.priceKrw ?? 0}
                  sellerUsername={sellerUsername}
                  onPurchaseSuccess={onPurchaseSuccess}
                />
              </LockedMediaPaywallOverlay>
            </div>
          );
        }
        return (
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
        );
      })}
    </div>
  );
}
