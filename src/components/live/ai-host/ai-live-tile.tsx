"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { User } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { LiveThumbnailLiveBadge } from "@/components/live/live-thumbnail-live-badge";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";

const MocoVrmStage = dynamic(
  () => import("@/components/live/ai-host/moco-vrm-stage").then((m) => m.MocoVrmStage),
  { ssr: false }
);

/** One grid cell that opens the official live. Same size as every other live. */
export function AiLiveTile() {
  const { t, locale } = useLocale();

  return (
    <Link href="/live/moco" prefetch={false} className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-sm">
        <img
          src="/live/moco-poster.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <MocoVrmStage framing="bust" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
        <LiveThumbnailLiveBadge className="absolute top-2.5 left-2.5" />
      </div>
      <div className="mt-2.5 flex min-w-0 gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/40 text-white/50 ring-2 ring-white/15">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold text-white">{t("live.aiHostName")}</p>
          <p className="line-clamp-1 text-[13px] text-white/65">{t("live.aiCardTitle")}</p>
          <span className="inline-flex rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
            {localizedLiveCategoryLabel("JUST_CHATTING", locale)}
          </span>
        </div>
      </div>
    </Link>
  );
}
