"use client";

import Link from "next/link";
import { memo } from "react";
import { Eye, Radio, Sparkles, User, Video, MessageSquare, Shield } from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { SupportTierLevel } from "@prisma/client";

export type LiveChannelCard = {
  id: string;
  name: string;
  createdBy: string;
  viewerCount: number;
};

export type LiveHost = {
  id: string;
  username: string;
  image: string | null;
  supportTierSent: SupportTierLevel;
};

const FEATURES = [
  { icon: Video, label: "HD 송출" },
  { icon: MessageSquare, label: "실시간 채팅" },
  { icon: Shield, label: "합방 비밀번호" },
  { icon: Eye, label: "실제 시청자 수" },
];

function LiveCard({ ch, host }: { ch: LiveChannelCard; host?: LiveHost }) {
  return (
    <Link href={`/voice/${ch.id}`} prefetch={false} className="live-card group">
      <div className="live-card-thumb">
        {host?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={host.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50 dark:opacity-40 group-hover:opacity-65 transition-opacity"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="h-12 w-12 text-folk-terracotta/40 dark:text-folk-terracotta/50" />
          </div>
        )}
        <div className="live-card-scrim" />
        <div className="absolute top-3 left-3">
          <span className="live-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        </div>
        <div className="absolute top-3 right-3 live-viewer-pill">
          <Eye className="h-3.5 w-3.5 text-folk-terracotta" />
          {ch.viewerCount}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-bold text-foreground dark:text-white text-sm sm:text-base line-clamp-2">
            {ch.name}
          </p>
          {host && (
            <p className="text-xs text-muted-foreground dark:text-zinc-300 mt-1 flex items-center gap-1 min-w-0">
              <User className="h-3 w-3 shrink-0" />
              <DisplayNameWithSupportTier
                name={host.username}
                tier={host.supportTierSent ?? "SEED"}
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

const LiveCardMemo = memo(LiveCard);

export function LiveDirectory({
  channels,
  hosts,
}: {
  channels: LiveChannelCard[];
  hosts: LiveHost[];
}) {
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));
  const totalViewers = channels.reduce((s, c) => s + c.viewerCount, 0);

  return (
    <div className="live-page-shell">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="live-hero flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-folk-terracotta text-white shadow-md">
                <Radio className="h-5 w-5" />
              </span>
              라이브
            </h1>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-background/80 dark:bg-white/5 border border-border/60 text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="[&_button]:rounded-xl shrink-0">
            <LivePageActions variant="header" />
          </div>
        </header>

        {channels.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">지금 방송</p>
              <p className="text-xl font-bold tabular-nums">{channels.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">총 시청자</p>
              <p className="text-xl font-bold tabular-nums text-folk-terracotta dark:text-folk-terracotta">
                {totalViewers}
              </p>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-folk-terracotta animate-pulse" />
            지금 방송 중 · {channels.length}
          </h2>
          {channels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <p className="text-muted-foreground font-medium">진행 중인 라이브가 없습니다.</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                방송을 시작하면 시청자가 입장할 때 여기에 표시됩니다. 빈 방·데모 목록은 표시하지 않습니다.
              </p>
              <LivePageActions variant="empty" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {channels.map((ch) => (
                <LiveCardMemo key={ch.id} ch={ch} host={hostMap[ch.createdBy]} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
