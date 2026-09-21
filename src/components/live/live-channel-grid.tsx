"use client";

import { memo, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Radio, User } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import {
  LiveFolderRail,
  type LiveFolderFilter,
} from "@/components/live/live-folder-rail";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LIVE_SMPTE_COLORS } from "@/lib/live-categories";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cardHover, pressTap } from "@/lib/motion-presets";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function LiveStreamCard({ ch, host }: { ch: LiveHubChannel; host?: LiveHubHost }) {
  const reduced = usePrefersReducedMotion();
  const { locale } = useLocale();
  const thumb = ch.thumbnailUrl ?? host?.image;
  const tags = (ch.tags ?? []).slice(0, 2);

  const card = (
    <Link href={`/voice/${ch.id}`} prefetch={false} className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-sm backdrop-blur-[2px]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--folk-cobalt)/0.35)] to-[hsl(var(--folk-gold)/0.25)]">
            <Radio className="h-10 w-10 text-folk-terracotta/55" />
          </div>
        )}
        {isLiveAdultChannel(ch) ? <LiveAdultWatermark /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
        <span className="live-badge absolute top-2.5 left-2.5 !bg-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
        <div className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          <Eye className="h-3 w-3" />
          {ch.viewerCount}
        </div>
      </div>

      <div className="mt-2.5 flex gap-2.5 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-black/40 ring-2 ring-white/15">
          {host?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={host.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white/50">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          {host ? (
            <p className="text-sm font-semibold truncate text-white">
              <DisplayNameWithSupportTier
                name={host.username}
                tier={(host.supportTierSent ?? "SEED") as SupportTierLevel}
                compact
                className="min-w-0"
              />
            </p>
          ) : null}
          <p className="text-[13px] text-white/65 line-clamp-1">{ch.name}</p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 font-medium">
              {localizedLiveCategoryLabel(ch.category, locale)}
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );

  if (reduced) {
    return <div className="min-w-0">{card}</div>;
  }

  return (
    <motion.div
      whileHover={cardHover}
      whileTap={pressTap}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="min-w-0"
    >
      {card}
    </motion.div>
  );
}

const LiveStreamCardMemo = memo(LiveStreamCard);
export { LiveStreamCardMemo };

/** Empty grid lead card — SMPTE color-bar TV (matches empty-broadcast mock). */
function LiveEmptyGridPlaceholder() {
  const { t } = useLocale();
  const colCount = LIVE_SMPTE_COLORS.length;

  return (
    <div className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/15 shadow-sm">
        <div
          className="absolute inset-0"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          }}
          aria-hidden
        >
          {LIVE_SMPTE_COLORS.map((color) => (
            <div key={color} className="min-h-0 min-w-0 h-full" style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <p className="rounded-full border border-white/15 bg-black/75 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm sm:text-sm">
            {t("live.noBroadcastHero")}
          </p>
        </div>
      </div>
    </div>
  );
}

function filterChannels(
  channels: LiveHubChannel[],
  filter: LiveFolderFilter,
  followedHostIds: Set<string>
): LiveHubChannel[] {
  if (filter === "ALL") return channels;
  if (filter === "FOLLOWING") {
    if (followedHostIds.size === 0) return [];
    return channels.filter((ch) => followedHostIds.has(ch.createdBy));
  }
  return channels.filter((ch) => ch.category === filter);
}

/** YouTube-style 4-column grid + folder rail on the right. */
export function LiveChannelGrid({
  channels,
  hosts,
  followedHostIds = [],
}: {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  followedHostIds?: string[];
  filteredCategory?: LiveStreamCategory;
  view?: "explore" | "following";
}) {
  const [activeFilter, setActiveFilter] = useState<LiveFolderFilter>("ALL");
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));
  const followedSet = useMemo(() => new Set(followedHostIds), [followedHostIds]);

  const visible = useMemo(
    () => filterChannels(channels, activeFilter, followedSet),
    [channels, activeFilter, followedSet]
  );
  const isEmpty = visible.length === 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-row gap-2.5 overflow-hidden sm:gap-4">
      {/* Only the live grid scrolls */}
      <div className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin pr-0.5">
        <div
          className={cn(
            "grid gap-4 sm:gap-5 pb-4 pt-1",
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          )}
        >
          {isEmpty ? <LiveEmptyGridPlaceholder /> : null}
          {visible.map((ch) => (
            <LiveStreamCardMemo key={ch.id} ch={ch} host={hostMap[ch.createdBy]} />
          ))}
        </div>
      </div>

      {/* Folder rail: fixed in the viewport column, never scrolls with the grid */}
      <div className="live-folder-rail-column sticky top-0 shrink-0 self-start overflow-visible pr-1">
        <Suspense
          fallback={
            <div
              className="w-[132px] rounded-b-[1.75rem] bg-white/90 animate-pulse"
              style={{ height: "min(640px, calc(100dvh - var(--header-h) - 2rem))" }}
            />
          }
        >
          <LiveFolderRail activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </Suspense>
      </div>
    </div>
  );
}
