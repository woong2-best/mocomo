"use client";

import { useState } from "react";
import type { ChatAttachmentView } from "@/lib/chat-attachments";
import { ChatVoiceMessage } from "@/components/chat/chat-voice-message";
import { LockedMediaPaywallOverlay } from "@/components/media/locked-media-paywall-overlay";
import { PurchaseMessageMediaButton } from "@/components/chat/purchase-message-media-button";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import { cn } from "@/lib/utils";

/**
 * The forensic canvas refuses to embed below MIN_FORENSIC_VERIFY_LONG_EDGE
 * (320 CSS px) because smaller frames cannot recover enough quadrant bits.
 * Paid DM media therefore gets a fixed portrait card instead of the ordinary
 * thumbnail box, so the long edge is always above the floor regardless of
 * viewport width.
 */
const PAID_TILE_CLASS = "h-[380px] w-[min(280px,72vw)]";

function isPaid(attachment: ChatAttachmentView) {
  return (attachment.priceKrw ?? 0) > 0;
}

function isLockedAttachment(attachment: ChatAttachmentView) {
  return Boolean(attachment.locked) || (!attachment.url && isPaid(attachment));
}

function LockedTile({
  attachment,
  isMine,
  sellerUsername,
  onPurchaseSuccess,
}: {
  attachment: ChatAttachmentView;
  isMine: boolean;
  sellerUsername?: string;
  onPurchaseSuccess?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative block overflow-hidden border border-border/40 bg-muted",
        PAID_TILE_CLASS,
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

  if (isLockedAttachment(attachment)) {
    return (
      <LockedTile
        attachment={attachment}
        isMine={isMine}
        sellerUsername={sellerUsername}
        onPurchaseSuccess={onPurchaseSuccess}
      />
    );
  }

  const radius = isMine ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md";

  // Purchased fan-art renders through the forensic canvas so every displayed
  // pixel carries this buyer's invisible session payload. No raw <img>, and no
  // "open in new tab" escape hatch.
  if (isPaid(attachment)) {
    return (
      <div className={cn("overflow-hidden border border-border/40 bg-black", PAID_TILE_CLASS, radius)}>
        <ProtectedPaidMedia
          type="IMAGE"
          src={attachment.url}
          mediaId={attachment.id}
          mediaPriceKrw={attachment.priceKrw ?? 0}
          contentKind="MESSAGE_ATTACHMENT"
          skipForensic={isMine}
          alt={alt}
          className="h-full w-full object-cover"
          objectFit="cover"
        />
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
      className={cn("block overflow-hidden border border-border/40 bg-black/5 max-w-[min(280px,72vw)]", radius)}
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

function ChatVideo({
  attachment,
  isMine,
  sellerUsername,
  onPurchaseSuccess,
}: {
  attachment: ChatAttachmentView;
  isMine: boolean;
  sellerUsername?: string;
  onPurchaseSuccess?: () => void;
}) {
  if (isLockedAttachment(attachment)) {
    return (
      <LockedTile
        attachment={attachment}
        isMine={isMine}
        sellerUsername={sellerUsername}
        onPurchaseSuccess={onPurchaseSuccess}
      />
    );
  }

  const radius = isMine ? "rounded-br-md" : "rounded-bl-md";

  if (isPaid(attachment)) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/40 bg-black",
          PAID_TILE_CLASS,
          radius
        )}
      >
        <ProtectedPaidMedia
          type="VIDEO"
          src={attachment.url}
          mediaId={attachment.id}
          mediaPriceKrw={attachment.priceKrw ?? 0}
          contentKind="MESSAGE_ATTACHMENT"
          skipForensic={isMine}
          className="h-full w-full object-cover"
          objectFit="cover"
          controls
          muted={false}
          autoPlayOnView={false}
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <video
      src={attachment.url}
      controls
      playsInline
      className={cn("max-w-[min(280px,72vw)] rounded-2xl border border-border/40", radius)}
    />
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

      {videos.map((a) => (
        <ChatVideo
          key={a.id}
          attachment={a}
          isMine={isMine}
          sellerUsername={sellerUsername}
          onPurchaseSuccess={onPurchaseSuccess}
        />
      ))}
    </div>
  );
}
