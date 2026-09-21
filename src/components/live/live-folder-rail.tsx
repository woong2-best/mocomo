"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MonitorPlay, Video } from "lucide-react";
import { isR18LiveCategory } from "@/lib/live-categories";
import type { LiveStreamCategory } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
  isLiveFeatureEnabled,
} from "@/lib/live-feature";
import { Button } from "@/components/ui/button";

export type LiveFolderFilter = "ALL" | "FOLLOWING" | LiveStreamCategory;

type FolderDef = {
  id: LiveFolderFilter;
  category?: LiveStreamCategory;
  src: string;
  label: string;
  /** Slot opening on holder.png, percent of tray height */
  topPct: number;
  heightPct: number;
};

/**
 * Slot openings measured from holder.png (inner-shadow tops, 130px pitch).
 * Idle should match the tucked look of rack-idle / photo 2.
 */
const FOLDERS: FolderDef[] = [
  { id: "ALL", src: "/images/live/folder-rack/folder-all.png?v=8", label: "ALL", topPct: 4.7, heightPct: 9.6 },
  {
    id: "FOLLOWING",
    category: "VIRTUAL",
    src: "/images/live/folder-rack/folder-following.png?v=8",
    label: "FOLLOWING",
    topPct: 17.4,
    heightPct: 9.6,
  },
  { id: "GAME", category: "GAME", src: "/images/live/folder-rack/folder-gaming.png?v=8", label: "GAMING", topPct: 30.1, heightPct: 9.6 },
  {
    id: "JUST_CHATTING",
    category: "JUST_CHATTING",
    src: "/images/live/folder-rack/folder-chatting.png?v=8",
    label: "CHATTING",
    topPct: 42.8,
    heightPct: 9.6,
  },
  { id: "IRL", category: "IRL", src: "/images/live/folder-rack/folder-festival.png?v=8", label: "FESTIVAL", topPct: 55.5, heightPct: 9.6 },
  { id: "MUSIC", category: "MUSIC", src: "/images/live/folder-rack/folder-music.png?v=8", label: "MUSIC", topPct: 68.2, heightPct: 9.6 },
  { id: "LIVE", category: "LIVE", src: "/images/live/folder-rack/folder-r18.png?v=8", label: "R-18", topPct: 80.9, heightPct: 9.6 },
];

function LiveRackActionButtons() {
  const sessionState = useSession();
  const session = sessionState?.data;

  if (!isLiveFeatureEnabled()) return null;

  const externalOn = isExternalLiveEnabled();
  const firstPartyOn = isFirstPartyLiveEnabled();
  const loggedIn = !!session?.user;

  const liveHref = !loggedIn
    ? "/auth/signin?callbackUrl=/live/external/new"
    : externalOn
      ? "/live/external/new"
      : firstPartyOn
        ? "/voice/new"
        : "/live/studio";

  const studioHref = loggedIn ? "/live/studio" : "/auth/signin?callbackUrl=/live/studio";

  return (
    <div className="mb-1.5 flex w-full shrink-0 flex-col gap-1.5">
      <Link href={liveHref} className="block w-full">
        <Button className="h-9 w-full rounded-xl gap-1.5 px-2 text-xs font-bold shadow-sm" size="sm">
          <Video className="h-3.5 w-3.5 shrink-0" />
          라이브
        </Button>
      </Link>
      <Link href={studioHref} className="block w-full">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full rounded-xl gap-1.5 border-white/25 bg-black/40 px-2 text-xs font-bold text-white hover:bg-black/55 hover:text-white"
        >
          <MonitorPlay className="h-3.5 w-3.5 shrink-0" />
          스튜디오
        </Button>
      </Link>
    </div>
  );
}

/**
 * Empty holder + one full folder per slot.
 * Rest = tucked in the pocket (photo 2). Hover = same folder slides up, then back down.
 */
export function LiveFolderRail({
  className,
  activeFilter,
  onFilterChange,
}: {
  className?: string;
  activeFilter: LiveFolderFilter;
  onFilterChange: (filter: LiveFolderFilter) => void;
}) {
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();
  const [hoverId, setHoverId] = useState<LiveFolderFilter | null>(null);

  async function onFolderClick(e: MouseEvent, folder: FolderDef) {
    e.preventDefault();
    if (checking) return;

    if (folder.id === "LIVE" || (folder.category && isR18LiveCategory(folder.category))) {
      const ok = await guardCategoryNav("LIVE");
      if (!ok) return;
    }

    onFilterChange(folder.id === activeFilter ? "ALL" : folder.id);
  }

  return (
    <>
      <div
        className={cn(
          "live-folder-rack flex h-full min-h-0 w-[118px] sm:w-[132px] md:w-[148px] shrink-0 flex-col overflow-visible",
          checking && "opacity-80",
          className
        )}
      >
        <LiveRackActionButtons />

        <aside className="relative min-h-0 w-full flex-1 overflow-visible" aria-label="Live category folders">
          <div className="relative h-full w-full overflow-visible">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/live/folder-rack/holder.png?v=8"
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill drop-shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
            />

            {FOLDERS.map((folder) => {
              const raised = hoverId === folder.id;

              return (
                <div
                  key={folder.id}
                  className={cn("absolute left-[8.5%] right-[8.5%] overflow-visible", raised ? "z-30" : "z-10")}
                  style={{
                    top: `${folder.topPct}%`,
                    height: `${folder.heightPct}%`,
                  }}
                >
                  <div className="live-folder-pocket">
                    <div className={cn("live-folder-slide", raised && "is-raised")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={folder.src}
                        alt=""
                        draggable={false}
                        className="pointer-events-none block h-auto w-full select-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => void onFolderClick(e, folder)}
                    onMouseEnter={() => setHoverId(folder.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(folder.id)}
                    onBlur={() => setHoverId(null)}
                    aria-label={folder.label}
                    aria-pressed={activeFilter === folder.id}
                    className={cn(
                      "absolute inset-x-0 bottom-0 z-40 cursor-pointer rounded-[10px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-terracotta/60",
                      raised ? "top-[-90%]" : "top-0"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </aside>
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}
