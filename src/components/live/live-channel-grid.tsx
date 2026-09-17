"use client";

import { memo, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Radio, User } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { LiveFolderChips } from "@/components/live/live-folder-chips";
import { LiveBeadFeed } from "@/components/live/live-bead-feed";
import { LiveHeroSpotlight } from "@/components/live/live-hero-spotlight";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cardHover, pressTap } from "@/lib/motion-presets";
import { useLocale } from "@/components/providers/locale-provider";

export function LiveStreamCard({ ch, host }: { ch: LiveHubChannel; host?: LiveHubHost }) {
  const reduced = usePrefersReducedMotion();
  const { locale } = useLocale();
  const thumb = ch.thumbnailUrl ?? host?.image;
  const tags = (ch.tags ?? []).slice(0, 2);

  const card = (
    <Link href={`/voice/${ch.id}`} prefetch={false} className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-[hsl(var(--folk-cobalt)/0.12)] shadow-sm">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--folk-cobalt)/0.2)] to-[hsl(var(--folk-gold)/0.25)]">
            <Radio className="h-10 w-10 text-folk-terracotta/45" />
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
        <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-muted ring-2 ring-[hsl(var(--folk-cobalt)/0.22)]">
          {host?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={host.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          {host ? (
            <p className="text-sm font-semibold truncate">
              <DisplayNameWithSupportTier
                name={host.username}
                tier={(host.supportTierSent ?? "SEED") as SupportTierLevel}
                compact
                className="min-w-0"
              />
            </p>
          ) : null}
          <p className="text-[13px] text-muted-foreground line-clamp-1">{ch.name}</p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
              {localizedLiveCategoryLabel(ch.category, locale)}
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
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
    return <div className="min-w-[240px] sm:min-w-0">{card}</div>;
  }

  return (
    <motion.div
      whileHover={cardHover}
      whileTap={pressTap}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="min-w-[240px] sm:min-w-0"
    >
      {card}
    </motion.div>
  );
}

const LiveStreamCardMemo = memo(LiveStreamCard);
export { LiveStreamCardMemo };

/** Folder chips + height-capped TV + compact adaptive bead feed. */
export function LiveChannelGrid({
  channels,
  hosts,
}: {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  filteredCategory?: LiveStreamCategory;
  view?: "explore" | "following";
}) {
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));
  const heroChannels = [...channels].sort((a, b) => b.viewerCount - a.viewerCount);

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1 w-full overflow-hidden">
      <Suspense fallback={<div className="h-[70px] rounded-xl bg-black/20 animate-pulse shrink-0" />}>
        <LiveFolderChips />
      </Suspense>
      <div className="flex flex-row gap-2.5 sm:gap-3 items-stretch min-h-0 flex-1 w-full overflow-hidden">
        <div className="min-w-0 flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          <LiveHeroSpotlight channels={heroChannels} hostMap={hostMap} />
        </div>
        <LiveBeadFeed channels={channels} hosts={hosts} />
      </div>
    </div>
  );
}
