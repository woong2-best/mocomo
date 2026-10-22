"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { LiveThumbnailLiveBadge } from "@/components/live/live-thumbnail-live-badge";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { IDOLS } from "@/lib/ai-live/idols";

/** Same card chrome as a normal live. The VRM loads after the viewer enters the room. */
export function IdolLiveTiles() {
  const { t, locale } = useLocale();
  const category = localizedLiveCategoryLabel("JUST_CHATTING", locale);

  return (
    <>
      {IDOLS.map((idol) => (
        <Link key={idol.id} href={`/live/${idol.id}`} prefetch={false} className="group block min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-sm">
            <img
              src={idol.poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_22%] transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
            <LiveThumbnailLiveBadge className="absolute top-2.5 left-2.5" />
          </div>
          <div className="mt-2.5 flex min-w-0 gap-2.5">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/40 ring-2 ring-white/15">
              <img src={idol.poster} alt="" className="h-full w-full object-cover object-[center_18%]" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-semibold text-white">{t(idol.nameKey)}</p>
              <p className="line-clamp-1 text-[13px] text-white/65">{t(idol.titleKey)}</p>
              <span className="inline-flex rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
                {category}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
