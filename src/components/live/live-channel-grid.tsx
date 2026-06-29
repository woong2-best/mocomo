import Link from "next/link";
import { memo } from "react";
import { Eye, Radio, Sparkles, User, Mic2 } from "lucide-react";
import { isVoiceBroadcastMode } from "@/lib/live-voice-broadcast";
import { LivePageActions } from "@/components/live/live-page-actions";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { liveCategoryLabel } from "@/lib/live-categories";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import type { SupportTierLevel } from "@prisma/client";

export function LiveStreamCard({ ch, host }: { ch: LiveHubChannel; host?: LiveHubHost }) {
  const thumb = ch.thumbnailUrl ?? host?.image;
  return (
    <Link href={`/voice/${ch.id}`} prefetch={false} className="live-card group">
      <div className="live-card-thumb">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50 dark:opacity-40 group-hover:opacity-65 transition-opacity"
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
            {isVoiceBroadcastMode(ch.broadcastMode) ? "Voice" : "Live"}
          </span>
          {isVoiceBroadcastMode(ch.broadcastMode) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/80 text-white font-medium flex items-center gap-0.5">
              <Mic2 className="h-3 w-3" />
              보이스
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-white font-medium">
            {liveCategoryLabel(ch.category)}
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
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));
  const totalViewers = channels.reduce((s, c) => s + c.viewerCount, 0);

  return (
    <>
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">지금 방송</p>
            <p className="text-xl font-bold tabular-nums">{channels.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">총 시청자</p>
            <p className="text-xl font-bold tabular-nums text-folk-terracotta dark:text-folk-terracotta">{totalViewers}</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-folk-terracotta animate-pulse" />
          실시간 방송 · {channels.length}
        </h2>
        {channels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <p className="text-muted-foreground font-medium">이 카테고리에 진행 중인 라이브가 없습니다.</p>
            <LivePageActions variant="empty" />
          </div>
        ) : (
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
