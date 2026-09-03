"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Radio, User } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { LiveHeroPreviewVideo } from "@/components/live/live-hero-preview-video";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import type { SupportTierLevel } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const AUTO_MS = 5500;

function formatViewerCountCompact(n: number, locale: string) {
  if (n >= 10000) {
    const man = n / 10000;
    const val = man >= 10 ? String(Math.round(man)) : man.toFixed(1).replace(/\.0$/, "");
    return locale.startsWith("ko") ? `${val}만` : `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return locale.startsWith("ko") ? `${val}천` : `${val}K`;
  }
  return n.toLocaleString(locale.startsWith("ko") ? "ko-KR" : "en-US");
}

function LiveHeroCarouselInner({
  channels,
  hostMap,
}: {
  channels: LiveHubChannel[];
  hostMap: Record<string, LiveHubHost>;
}) {
  const { locale } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const heroItems = useMemo(
    () => [...channels].sort((a, b) => b.viewerCount - a.viewerCount),
    [channels]
  );

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const slide = el.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);

  const goNext = useCallback(() => {
    if (heroItems.length <= 1) return;
    setActive((prev) => {
      const next = (prev + 1) % heroItems.length;
      scrollToIndex(next);
      return next;
    });
  }, [heroItems.length, scrollToIndex]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timer = setInterval(goNext, AUTO_MS);
    return () => clearInterval(timer);
  }, [goNext, heroItems.length]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || heroItems.length === 0) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    setActive(Math.max(0, Math.min(idx, heroItems.length - 1)));
  }, [heroItems.length]);

  if (heroItems.length === 0) return null;

  return (
    <section className="space-y-3">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none -mx-1 px-1"
      >
        {heroItems.map((ch, slideIndex) => {
          const host = hostMap[ch.createdBy];
          const thumb = ch.thumbnailUrl ?? host?.image ?? null;
          const isActive = slideIndex === active;

          return (
            <Link
              key={ch.id}
              href={`/voice/${ch.id}`}
              prefetch={false}
              className="group block w-full shrink-0 snap-start"
            >
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/50 bg-black/30 shadow-lg">
                <LiveHeroPreviewVideo
                  channelId={ch.id}
                  broadcastMode={ch.broadcastMode}
                  active={isActive}
                  posterUrl={thumb}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
                {!thumb ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--folk-cobalt)/0.25)] to-[hsl(var(--folk-gold)/0.2)]">
                    <Radio className="h-14 w-14 text-folk-terracotta/40" />
                  </div>
                ) : null}
                {isLiveAdultChannel(ch) ? <LiveAdultWatermark /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 pointer-events-none" />

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E02020] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                  <span className="rounded-md bg-black/55 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
                    {formatViewerCountCompact(ch.viewerCount, locale)}
                    {locale.startsWith("ko") ? "명" : ""}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 space-y-2 pointer-events-none">
                  {host ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-muted ring-2 ring-white/25">
                        {host.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={host.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/70">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white truncate">
                        <DisplayNameWithSupportTier
                          name={host.username}
                          tier={(host.supportTierSent ?? "SEED") as SupportTierLevel}
                          compact
                          className="text-white min-w-0"
                        />
                      </p>
                    </div>
                  ) : null}
                  <p className="text-lg sm:text-xl font-black text-white line-clamp-2 leading-snug drop-shadow">
                    {ch.name}
                  </p>
                  <span className="inline-flex rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/90">
                    {localizedLiveCategoryLabel(ch.category, locale)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {heroItems.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {heroItems.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => {
                setActive(i);
                scrollToIndex(i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active ? "w-5 bg-folk-terracotta" : "w-1.5 bg-border hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export const LiveHeroCarousel = memo(LiveHeroCarouselInner);
