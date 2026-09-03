"use client";

import Link from "next/link";
import { memo } from "react";
import { Radio, User } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { LiveAdultWatermark, isLiveAdultChannel } from "@/components/live/live-adult-watermark";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import type { SupportTierLevel } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";

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

function LiveStreamListRowInner({
  ch,
  host,
}: {
  ch: LiveHubChannel;
  host?: LiveHubHost;
}) {
  const { locale } = useLocale();
  const thumb = ch.thumbnailUrl ?? host?.image;
  const tags = (ch.tags ?? []).slice(0, 2);

  return (
    <Link
      href={`/voice/${ch.id}`}
      prefetch={false}
      className="group flex gap-3 sm:gap-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 -mx-1 px-1 rounded-lg transition-colors"
    >
      <div className="relative w-[128px] sm:w-[148px] shrink-0 aspect-video overflow-hidden rounded-lg bg-black/20">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Radio className="h-6 w-6 text-folk-terracotta/40" />
          </div>
        )}
        {isLiveAdultChannel(ch) ? <LiveAdultWatermark /> : null}
        <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E02020]" />
          {formatViewerCountCompact(ch.viewerCount, locale)}
          {locale.startsWith("ko") ? "명" : ""}
        </div>
      </div>

      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5 py-0.5">
        <p className="text-sm sm:text-[15px] font-bold leading-snug line-clamp-2 group-hover:text-folk-terracotta transition-colors">
          {ch.name}
        </p>
        {host ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 shrink-0 rounded-full overflow-hidden bg-muted ring-1 ring-border/60">
              {host.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={host.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <User className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate font-medium">
              <DisplayNameWithSupportTier
                name={host.username}
                tier={(host.supportTierSent ?? "SEED") as SupportTierLevel}
                compact
                className="min-w-0"
              />
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1">
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
    </Link>
  );
}

export const LiveStreamListRow = memo(LiveStreamListRowInner);
