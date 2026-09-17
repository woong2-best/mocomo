"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LIVE_CATEGORY_ORDER, isR18LiveCategory } from "@/lib/live-categories";
import type { LiveStreamCategory } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";

function categoryHref(cat: LiveStreamCategory) {
  return cat === "VIRTUAL" ? "/live?view=following" : `/live?category=${cat}`;
}

/** Body + glossy tab tint — mockup palette (pink · orange · blue · green · purple · maroon). */
const FOLDER_COLORS: Record<LiveStreamCategory, { body: string; tab: string }> = {
  VIRTUAL: { body: "#E090B0", tab: "rgba(255,255,255,0.42)" },
  GAME: { body: "#E08020", tab: "rgba(255,220,160,0.38)" },
  JUST_CHATTING: { body: "#1E3AD0", tab: "rgba(180,200,255,0.4)" },
  IRL: { body: "#2F9A4A", tab: "rgba(200,255,210,0.35)" },
  MUSIC: { body: "#8A2A9A", tab: "rgba(230,180,255,0.35)" },
  LIVE: { body: "#6B1818", tab: "rgba(255,160,140,0.28)" },
};

/**
 * Large overlapping folder wall — labels on each file face (mockup parity).
 */
export function LiveFolderWall({ showEmptyNotice = true }: { showEmptyNotice?: boolean }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cats = LIVE_CATEGORY_ORDER;
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();
  const currentCat = searchParams.get("category");
  const following = searchParams.get("view") === "following";

  async function onCategoryActivate(e: MouseEvent, cat: LiveStreamCategory) {
    if (!isR18LiveCategory(cat)) return;
    e.preventDefault();
    if (checking) return;
    const ok = await guardCategoryNav(cat);
    if (ok) router.push(categoryHref(cat));
  }

  return (
    <>
      <div
        className={cn(
          "relative flex-1 min-w-0 min-h-[280px] sm:min-h-[360px] lg:min-h-0 h-full",
          "rounded-2xl overflow-hidden border border-white/10 bg-black shadow-lg",
          checking && "opacity-70"
        )}
      >
        <div className="absolute inset-0 flex items-stretch pt-3 sm:pt-4">
          {cats.map((cat, i) => {
            const label = localizedLiveCategoryLabel(cat, locale);
            const href = categoryHref(cat);
            const colors = FOLDER_COLORS[cat];
            const active =
              cat === "VIRTUAL" ? following : !following && currentCat === cat;
            return (
              <Link
                key={cat}
                href={href}
                onClick={(e) => void onCategoryActivate(e, cat)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative min-w-0 flex-1 group",
                  "transition-[filter,transform] duration-200 hover:brightness-110",
                  active && "brightness-110"
                )}
                style={{ zIndex: active ? 40 : i + 1 }}
              >
                {/* Folder tab */}
                <span
                  className="absolute left-[8%] right-[18%] -top-3 sm:-top-4 h-5 sm:h-6 rounded-t-md"
                  style={{
                    background: `linear-gradient(180deg, ${colors.tab} 0%, ${colors.body} 100%)`,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                  }}
                />
                {/* Folder body */}
                <span
                  className="absolute inset-x-0 top-1 bottom-0 rounded-b-md"
                  style={{
                    background: `linear-gradient(165deg, ${colors.body} 0%, color-mix(in srgb, ${colors.body} 78%, #000) 100%)`,
                    boxShadow:
                      i === 0
                        ? "inset 1px 0 0 rgba(255,255,255,0.12)"
                        : "inset 1px 0 0 rgba(0,0,0,0.25), inset -1px 0 0 rgba(255,255,255,0.06)",
                  }}
                />
                {/* Gloss */}
                <span
                  className="absolute inset-x-0 top-1 h-[28%] pointer-events-none opacity-40"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 100%)",
                  }}
                />
                <span
                  className={cn(
                    "absolute inset-x-[8%] bottom-[20%] z-10",
                    "text-center text-white font-black uppercase tracking-wide",
                    "text-[10px] sm:text-xs md:text-sm lg:text-[15px] leading-tight",
                    "drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
                  )}
                >
                  {label}
                </span>
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-white/70" />
                ) : null}
              </Link>
            );
          })}
        </div>

        {showEmptyNotice ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <p className="rounded-full bg-black/70 px-5 py-2.5 text-sm sm:text-base font-semibold text-white backdrop-blur-sm border border-white/15 shadow-lg">
              {t("live.noBroadcastHero")}
            </p>
          </div>
        ) : null}
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
