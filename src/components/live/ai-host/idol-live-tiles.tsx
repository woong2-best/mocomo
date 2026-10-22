"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { IDOLS } from "@/lib/ai-live/idols";

/** Poster cards only. The VRM loads after the viewer enters the room. */
export function IdolLiveTiles() {
  const { t } = useLocale();

  return (
    <>
      {IDOLS.map((idol) => (
        <Link key={idol.id} href={`/live/${idol.id}`} prefetch={false} className="group block min-w-0">
          <div
            className="relative aspect-video overflow-hidden rounded-xl border border-white/10"
            style={{ background: `linear-gradient(160deg, ${idol.accent}, #241c33 68%)` }}
          >
            <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[#1a4fa0] px-1.5 py-0.5 text-[10px] font-black text-white">
              {t("live.idol.badge")}
            </span>
            <span className="pointer-events-none absolute bottom-3 left-3 text-2xl font-black tracking-wide text-white">
              {t(idol.nameKey)}
            </span>
          </div>
          <div className="mt-2.5 min-w-0 space-y-0.5">
            <p className="truncate text-sm font-semibold text-white">{t(idol.nameKey)}</p>
            <p className="line-clamp-1 text-[13px] text-white/65">{t(idol.titleKey)}</p>
            <span className="inline-flex rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
              {t(idol.roleKey)}
            </span>
          </div>
        </Link>
      ))}
    </>
  );
}
