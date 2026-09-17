"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import {
  LIVE_CATEGORY_ICON,
  LIVE_CATEGORY_ORDER,
  isR18LiveCategory,
} from "@/lib/live-categories";
import type { LiveStreamCategory } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";

function categoryHref(cat: LiveStreamCategory) {
  return cat === "VIRTUAL" ? "/live?view=following" : `/live?category=${cat}`;
}

/**
 * Compact folder buttons — labels drawn ON the folder asset (not on the TV screen).
 * Separate from the SMPTE / live hero below.
 */
export function LiveFolderChips() {
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
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
          "flex gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none pb-0.5 -mx-0.5 px-0.5 shrink-0",
          checking && "opacity-70"
        )}
      >
        {LIVE_CATEGORY_ORDER.map((cat) => {
          const label = localizedLiveCategoryLabel(cat, locale);
          const href = categoryHref(cat);
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
                "relative shrink-0 w-[58px] h-[70px] sm:w-[64px] sm:h-[78px]",
                "transition-transform duration-150 hover:scale-105 active:scale-[0.98]",
                active ? "opacity-100 scale-105" : "opacity-90"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LIVE_CATEGORY_ICON[cat]}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none"
                draggable={false}
              />
              <span
                className={cn(
                  "absolute left-[10%] right-[8%] bottom-[10%]",
                  "text-white font-black uppercase tracking-wide",
                  "text-[8px] sm:text-[9px] leading-[1.1]",
                  "drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] line-clamp-2"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
