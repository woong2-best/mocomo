"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Mic2, Radio } from "lucide-react";
import { isVoiceBroadcastMode } from "@/lib/live-voice-broadcast";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type { ProfileLiveBroadcast } from "@/lib/profile-live-broadcast";

export function ProfileLiveBanner({
  live,
  className,
}: {
  live: ProfileLiveBroadcast;
  className?: string;
}) {
  const { t } = useLocale();
  const voice = isVoiceBroadcastMode(live.broadcastMode);
  const href = `/voice/${live.channelId}`;

  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden outline-none",
        "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      aria-label={`${t("profile.liveNow")}: ${live.name}`}
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          voice
            ? "bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-800"
            : "bg-gradient-to-r from-[#c23a22] via-[#e85d3a] to-[#b8321a]"
        )}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay bg-[radial-gradient(ellipse_at_20%_50%,rgba(255,255,255,0.35),transparent_55%),radial-gradient(ellipse_at_90%_0%,rgba(255,220,180,0.25),transparent_40%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[profile-live-sweep_3.2s_ease-in-out_infinite]"
        aria-hidden
      />

      <div className="relative flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
        <span
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
            "ring-2 ring-white/35",
            voice ? "bg-violet-950/50" : "bg-black/25"
          )}
        >
          {voice ? <Mic2 className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
        </span>

        <div className="min-w-0 flex-1 text-white">
          <div className="flex items-center gap-2">
            <span className="live-badge !bg-white !text-[#c23a22] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c23a22] animate-pulse" />
              LIVE
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
              {t("profile.liveNow")}
            </span>
          </div>
          <p className="mt-1 truncate text-[15px] font-bold leading-tight tracking-tight drop-shadow-sm">
            {live.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-white/80">
            {t("profile.liveTapToWatch")}
          </p>
        </div>

        <span
          className={cn(
            "flex shrink-0 items-center gap-0.5 rounded-full bg-white/95 px-3 py-2 text-xs font-bold shadow-md",
            "transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-[0.98]",
            voice ? "text-violet-800" : "text-[#c23a22]"
          )}
        >
          {t("profile.liveWatch")}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** 아바타 바깥 라이브 링 — Instagram Live 스타일 */
export function ProfileLiveAvatarRing({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex rounded-full p-[3px]",
        "bg-[conic-gradient(from_210deg,#ff4d4d,#ffb347,#ff4d4d,#e11d48,#ff4d4d)]",
        "shadow-[0_0_0_1px_rgba(255,77,77,0.35),0_8px_24px_rgba(194,58,34,0.35)]",
        "transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
        className
      )}
      aria-label={t("profile.liveNow")}
      title={t("profile.liveNow")}
    >
      <span
        className="absolute inset-0 rounded-full animate-[profile-live-ring_2.4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_60%,rgba(255,255,255,0.55)_75%,transparent_90%)] opacity-70"
        aria-hidden
      />
      <span className="relative rounded-full bg-background p-0.5">{children}</span>
    </Link>
  );
}
