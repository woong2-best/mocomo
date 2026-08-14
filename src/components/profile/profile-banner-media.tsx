"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  MAX_PROFILE_BANNER_VIDEO_DURATION_SEC,
  profileBannerHasVideo,
  profileBannerImageUrl,
} from "@/lib/profile-banner";

type Props = {
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  className?: string;
  /** Pause playback when off-screen (drawer/modal). Default true. */
  active?: boolean;
};

export function ProfileBannerMedia({
  bannerUrl,
  bannerVideoUrl,
  className,
  active = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = profileBannerHasVideo(bannerVideoUrl) ? bannerVideoUrl!.trim() : null;
  const imageSrc = profileBannerImageUrl(bannerUrl, bannerVideoUrl);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSrc) return;
    if (active) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [active, videoSrc]);

  if (videoSrc) {
    return (
      <video
        ref={videoRef}
        src={videoSrc}
        className={cn("h-full w-full object-cover", className)}
        muted
        autoPlay
        playsInline
        loop
        preload="metadata"
        aria-hidden
      />
    );
  }

  if (imageSrc) {
    return (
      <div
        className={cn("h-full w-full bg-cover bg-center", className)}
        style={{ backgroundImage: `url(${imageSrc})` }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "h-full w-full bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30",
        className
      )}
      aria-hidden
    />
  );
}

export function profileBannerFieldHint(): string {
  return `배너 동영상은 최대 ${MAX_PROFILE_BANNER_VIDEO_DURATION_SEC}초, 무음 자동 재생됩니다.`;
}
