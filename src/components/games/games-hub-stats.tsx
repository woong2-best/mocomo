"use client";

import Link from "next/link";
import { History, Radio, Trophy, Users } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { countByStatus } from "@/lib/minigames/registry";

const QUICK_LINKS = [
  { href: "/games/ranking", label: "랭킹", icon: Trophy },
  { href: "/games/history", label: "전적", icon: History },
  { href: "/games/live", label: "관전", icon: Radio },
] as const;

export function GamesHubStats() {
  const liveCount = countByStatus("live") + countByStatus("beta");
  const soonCount = countByStatus("coming_soon");

  return (
    <PageSection
      title="게임 허브"
      description="실시간 매칭 · 친구 방 · 랭킹 · 관전"
      variant="card"
      className="!p-4"
    >
      <div className="flex flex-wrap gap-2 text-xs mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 px-2.5 py-1 font-medium">
          <Radio className="h-3 w-3" />
          플레이 가능 {liveCount}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
          준비 중 {soonCount}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1">
          <Users className="h-3 w-3" />
          2~5인 · 친구 방
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="folk-card-interactive flex flex-col items-center gap-1 rounded-xl border border-folk-cobalt/20 bg-folk-cream/50 py-2.5 text-center"
          >
            <Icon className="h-4 w-4 text-folk-terracotta" />
            <span className="text-[11px] font-bold text-folk-cobalt">{label}</span>
          </Link>
        ))}
      </div>
    </PageSection>
  );
}
