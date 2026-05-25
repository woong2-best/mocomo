"use client";

import Link from "next/link";
import { memo } from "react";
import { Eye, Radio, User } from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";

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
};

function LiveCard({ ch, host }: { ch: LiveChannelCard; host?: LiveHost }) {
  return (
    <Link
      href={`/voice/${ch.id}`}
      prefetch={false}
      className="group block rounded-2xl overflow-hidden bg-[#0f0f12] border border-white/10 hover:border-red-500/60 hover:shadow-[0_0_24px_rgba(239,68,68,0.15)] transition-all duration-200"
    >
      <div className="relative aspect-video bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        {host?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={host.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-bold uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-bold text-white text-sm sm:text-base line-clamp-2 drop-shadow">{ch.name}</p>
          {host && (
            <p className="text-xs text-zinc-300 mt-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              {host.username}
            </p>
          )}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 text-xs text-white font-medium tabular-nums">
          <Eye className="h-3.5 w-3.5" />
          {ch.viewerCount}
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

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white -m-4 lg:-m-6 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 tracking-tight">
              <Radio className="h-8 w-8 text-red-500" />
              라이브
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-md">
              실시간 방송만 표시됩니다. 합방 비밀번호로 입장 · 실제 시청자 수 · 저장되는 채팅.
            </p>
          </div>
          <div className="[&_button]:rounded-xl">
            <LivePageActions variant="header" />
          </div>
        </header>

        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            지금 방송 중 · {channels.length}
          </h2>
          {channels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 py-20 text-center space-y-4">
              <Radio className="h-12 w-12 mx-auto text-zinc-600" />
              <p className="text-zinc-400">진행 중인 라이브가 없습니다.</p>
              <p className="text-xs text-zinc-500">방송을 시작하면 시청자가 입장할 때 여기에 표시됩니다.</p>
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
