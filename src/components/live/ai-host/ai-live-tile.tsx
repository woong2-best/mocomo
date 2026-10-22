"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";

const MocoVrmStage = dynamic(
  () => import("@/components/live/ai-host/moco-vrm-stage").then((m) => m.MocoVrmStage),
  { ssr: false }
);

/** One grid cell that opens the official live. Same size as every other live. */
export function AiLiveTile() {
  const { t } = useLocale();

  return (
    <Link href="/live/moco" prefetch={false} className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#241c33]">
        <img
          src="/live/moco-poster.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <MocoVrmStage framing="bust" />
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[#1a4fa0] px-1.5 py-0.5 text-[10px] font-black text-white">
          {t("live.aiOfficialBadge")}
        </span>
      </div>
      <div className="mt-2.5 min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold text-white">{t("live.aiHostName")}</p>
        <p className="line-clamp-1 text-[13px] text-white/65">{t("live.aiCardTitle")}</p>
        <span className="inline-flex rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
          {t("live.aiCardSub")}
        </span>
      </div>
    </Link>
  );
}
