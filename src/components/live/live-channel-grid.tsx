"use client";

import Link from "next/link";
import { memo } from "react";
import { motion } from "framer-motion";
import { Eye, Radio, User } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { LivePopularCategories } from "@/components/live/live-popular-categories";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cardHover, pressTap } from "@/lib/motion-presets";
import { useLocale } from "@/components/providers/locale-provider";

const ROW_ORDER: LiveStreamCategory[] = [
  "JUST_CHATTING",
  "GAME",
  "IRL",
  "MUSIC",
  "LIVE",
];

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

function CategoryStreamRow({
  title,
  category,
  channels,
  hostMap,
}: {
  title: string;
  category: LiveStreamCategory;
  channels: LiveHubChannel[];
  hostMap: Record<string, LiveHubHost>;
}) {
  const { t } = useLocale();
  if (channels.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold tracking-tight">{title}</h2>
        <Link
          href={`/live?category=${category}`}
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {t("live.viewAll")}
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 sm:grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:overflow-visible">
        {channels.slice(0, 8).map((ch) => (
          <LiveStreamCardMemo key={ch.id} ch={ch} host={hostMap[ch.createdBy]} />
        ))}
      </div>
    </section>
  );
}

export function LiveChannelGrid({
  channels,
  hosts,
  filteredCategory,
}: {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  filteredCategory?: LiveStreamCategory;
}) {
  const { locale, t } = useLocale();
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));

  const viewerByCategory = channels.reduce(
    (acc, ch) => {
      acc[ch.category] = (acc[ch.category] ?? 0) + ch.viewerCount;
      return acc;
    },
    {} as Partial<Record<LiveStreamCategory, number>>
  );

  if (filteredCategory) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-folk-terracotta animate-pulse" />
            {localizedLiveCategoryLabel(filteredCategory, locale)} · {channels.length}
          </h2>
        </div>
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">{t("live.emptyCategory")}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {channels.map((ch) => (
              <LiveStreamCardMemo key={ch.id} ch={ch} host={hostMap[ch.createdBy]} />
            ))}
          </div>
        )}
      </section>
    );
  }

  const byCategory = ROW_ORDER.map((cat) => ({
    cat,
    title: localizedLiveCategoryLabel(cat, locale),
    items: channels.filter((c) => c.category === cat),
  })).filter((row) => row.items.length > 0);

  return (
    <div className="space-y-8">
      <LivePopularCategories viewerByCategory={viewerByCategory} />

      {byCategory.length > 0 ? (
        byCategory.map((row, idx) => (
          <div key={row.cat} className="space-y-8">
            {idx > 0 ? (
              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-x-0 h-px bg-border/70" />
                <span className="relative bg-[hsl(var(--folk-cream))] dark:bg-[hsl(224,45%,10%)] px-3 text-xs font-medium text-muted-foreground">
                  {t("live.showMore")}
                </span>
              </div>
            ) : null}
            <CategoryStreamRow
              title={row.title}
              category={row.cat}
              channels={row.items}
              hostMap={hostMap}
            />
          </div>
        ))
      ) : (
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-folk-terracotta animate-pulse" />
            {t("live.liveBroadcasts")} · 0
          </h2>
          <p className="text-sm text-muted-foreground">{t("live.emptyCategory")}</p>
        </section>
      )}
    </div>
  );
}
