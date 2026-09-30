"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Radio, User } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { LiveHubTabBar } from "@/components/live/live-hub-tab-bar";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
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

const GRAY_PLACEHOLDER_COUNT = 10;

function LiveGrayPlaceholderCard({ index }: { index: number }) {
  const shade = 22 + (index % 5) * 4;
  return (
    <div
      className="min-w-0 rounded-xl border border-white/[0.06] aspect-video"
      style={{ backgroundColor: `rgb(${shade},${shade},${shade + 2})` }}
      aria-hidden
    />
  );
}

/** Category tabs + neon bar + 3-column grid. */
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
    <div className="flex w-full min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
      <div className="shrink-0 min-w-0 max-w-full px-0.5 pb-2">
        <LiveHubTabBar active={activeFilter} onChange={setActiveFilter} />
      </div>
      <div className="relative min-w-0">
        <div className={cn("grid gap-3 sm:gap-4 pb-4 pt-0.5", "grid-cols-3")}>
          {isEmpty
            ? Array.from({ length: GRAY_PLACEHOLDER_COUNT }, (_, i) => (
                <LiveGrayPlaceholderCard key={`ph-${i}`} index={i} />
              ))
            : visible.map((ch) => (
                <LiveStreamCardMemo key={ch.id} ch={ch} host={hostMap[ch.createdBy]} />
              ))}
        </div>
      </div>
    </div>
  );
}
