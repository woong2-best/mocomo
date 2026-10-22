"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";

const MocoVrmStage = dynamic(
  () => import("@/components/live/ai-host/moco-vrm-stage").then((m) => m.MocoVrmStage),
  { ssr: false }
);

/** Watch page for the official host. The character is the broadcast. No chat. */
export function MocoLiveRoom() {
  const { t } = useLocale();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-3 py-4">
      <Link href="/live" className="w-fit text-sm font-semibold text-white/70 hover:text-white">
        {t("live.navBack")}
      </Link>
      <div className="relative mt-3 aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#241c33]">
        <img
          src="/live/moco-poster.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <MocoVrmStage framing="stage" />
        <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-[#1a4fa0] px-2 py-1 text-[11px] font-black text-white">
          {t("live.aiOfficialBadge")}
        </span>
      </div>
      <h1 className="mt-3 text-lg font-semibold text-white">{t("live.aiHostName")}</h1>
      <p className="text-sm text-white/65">{t("live.aiCardTitle")}</p>
      <p className="mt-1 text-xs text-white/45">{t("live.aiCardSub")}</p>
    </div>
  );
}
