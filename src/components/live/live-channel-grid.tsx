"use client";

import Link from "next/link";
import { memo } from "react";
import { motion } from "framer-motion";
import { Eye, Radio, User } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import type { SupportTierLevel } from "@prisma/client";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cardHover, pressTap } from "@/lib/motion-presets";
import { useLocale } from "@/components/providers/locale-provider";

export function LiveStreamCard({ ch, host }: { ch: LiveHubChannel; host?: LiveHubHost }) {
  const reduced = usePrefersReducedMotion();
  const { locale } = useLocale();
  const thumb = ch.thumbnailUrl ?? host?.image;
  const card = (
    <Link href={`/voice/${ch.id}`} prefetch={false} className="live-card group block">
      <div className="live-card-thumb">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50 dark:opacity-40 group-hover:opacity-65 transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="h-12 w-12 text-folk-terracotta/40" />
          </div>
        )}
        <div className="live-card-scrim" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="live-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-white font-medium">
            {localizedLiveCategoryLabel(ch.category, locale)}
          </span>
        </div>
        <div className="absolute top-3 right-3 live-viewer-pill">
          <Eye className="h-3.5 w-3.5 text-folk-terracotta" />
          {ch.viewerCount}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-bold text-sm sm:text-base line-clamp-2 text-foreground dark:text-white">{ch.name}</p>
          {host && (
            <p className="text-xs text-muted-foreground dark:text-zinc-300 mt-1 flex items-center gap-1 min-w-0">
              <User className="h-3 w-3 shrink-0" />
              <DisplayNameWithSupportTier
                name={host.username}
                tier={(host.supportTierSent ?? "PEBBLE") as SupportTierLevel}
                compact
                className="min-w-0"
              />
            </p>
          )}
        </div>
      </div>
    </Link>
  );

  if (reduced) return card;

  return (
    <motion.div
      whileHover={cardHover}
      whileTap={pressTap}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
    >
      {card}
    </motion.div>
  );
}

const LiveStreamCardMemo = memo(LiveStreamCard);
export { LiveStreamCardMemo };

export function LiveChannelGrid({
  channels,
  hosts,
}: {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
}) {
  const { t } = useLocale();
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));
  const totalViewers = channels.reduce((s, c) => s + c.viewerCount, 0);

  return (
    <>
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{t("live.onAir")}</p>
            <p className="text-xl font-bold tabular-nums">{channels.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{t("live.totalViewers")}</p>
            <p className="text-xl font-bold tabular-nums text-folk-terracotta dark:text-folk-terracotta">{totalViewers}</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-folk-terracotta animate-pulse" />
          {t("live.liveBroadcasts")} · {channels.length}
        </h2>
        {channels.length === 0 ? null : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {channels.map((ch) => (
              <LiveStreamCardMemo key={ch.id} ch={ch} host={hostMap[ch.createdBy]} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
