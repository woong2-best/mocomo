"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  MAX_PROFILE_BANNER_VIDEO_DURATION_SEC,
  BANNER_VIDEO_FORMAT_HINT,
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

function useShouldPlayVideo(active: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [docVisible, setDocVisible] = useState(true);

  useEffect(() => {
    const onVis = () => setDocVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.05, rootMargin: "48px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { rootRef, shouldPlay: active && inView && docVisible };
}

export function ProfileBannerMedia({
  bannerUrl,
  bannerVideoUrl,
  className,
  active = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const videoSrc = profileBannerHasVideo(bannerVideoUrl) ? bannerVideoUrl!.trim() : null;
  const imageSrc = profileBannerImageUrl(bannerUrl, bannerVideoUrl);
  const { rootRef, shouldPlay } = useShouldPlayVideo(active);

  useEffect(() => {
    setVideoError(false);
  }, [videoSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSrc) return;
    if (shouldPlay) {
      void el.play().catch(() => setVideoError(true));
    } else {
      el.pause();
    }
  }, [shouldPlay, videoSrc]);

  const mediaClass = cn("absolute inset-0 h-full w-full object-cover", className);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden">
      {videoSrc && !videoError ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className={mediaClass}
          muted
          autoPlay
          playsInline
          loop
          preload={shouldPlay ? "auto" : "none"}
          aria-hidden
          onError={() => setVideoError(true)}
        />
      ) : null}

      {imageSrc && (!videoSrc || videoError) ? (
        <div
          className={cn(mediaClass, "bg-cover bg-center")}
          style={{ backgroundImage: `url(${imageSrc})` }}
          aria-hidden
        />
      ) : null}

      {!imageSrc && (!videoSrc || videoError) ? (
        <div
          className={cn(
            mediaClass,
            "bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30"
          )}
          aria-hidden
        />
      ) : null}

      {videoSrc && videoError ? (
        <div className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-center text-[10px] text-muted-foreground backdrop-blur-sm">
          {t("profile.mp4_h_264_h_265")}
        </div>
      ) : null}
    </div>
  );
}

export function profileBannerFieldHint(): string {
  return t("profile.s1r3r45k", {
    v0: MAX_PROFILE_BANNER_VIDEO_DURATION_SEC,
    v1: BANNER_VIDEO_FORMAT_HINT,
  });
}
