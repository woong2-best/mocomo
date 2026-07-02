"use client";

import { cn } from "@/lib/utils";
import { shouldProtectPaidMediaView } from "@/lib/paid-media-protection";
import { PaidMediaProtectionShell } from "@/components/media/paid-media-protection-shell";

type Props = {
  type: string;
  src: string;
  className?: string;
  mediaPriceKrw?: number | null;
  postInstantPurchasePriceKrw?: number | null;
  locked?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  loading?: "lazy" | "eager";
  alt?: string;
  controls?: boolean;
};

export function ProtectedPaidMedia({
  type,
  src,
  className,
  mediaPriceKrw,
  postInstantPurchasePriceKrw,
  locked,
  muted = true,
  playsInline = true,
  preload = "metadata",
  loading = "lazy",
  alt = "",
  controls = false,
}: Props) {
  const protect = shouldProtectPaidMediaView({
    mediaPriceKrw,
    postInstantPurchasePriceKrw,
    locked,
  });

  const isVideo = type === "VIDEO";

  const media = isVideo ? (
    <video
      src={src}
      className={cn(className, protect && !controls && "pointer-events-none")}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      controls={controls}
      disablePictureInPicture
      controlsList="nodownload noremoteplayback"
      onContextMenu={(e) => e.preventDefault()}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(className, protect && "pointer-events-none")}
      loading={loading}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  );

  if (!protect) return media;

  return (
    <PaidMediaProtectionShell className={cn("overflow-hidden", className)}>
      <div className="relative w-full h-full">
        {media}
        {/* 길게 눌러 저장·드래그 방지 */}
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </PaidMediaProtectionShell>
  );
}
