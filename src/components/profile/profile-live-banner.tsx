"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  const href = live.watchHref;

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
        className="absolute inset-0 bg-gradient-to-r from-[#c23a22] via-[#e85d3a] to-[#b8321a]"
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

      <div className="relative flex items-center justify-between gap-3 px-4 py-1 sm:px-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
          {t("profile.liveNow")}
        </span>

        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-[#c23a22] shadow-sm transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-[0.98]">
          {t("profile.liveWatch")}
          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
