"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { SupportTierLevel } from "@prisma/client";
import type { ChibiAvatarConfig } from "@/lib/apt/bondee/types";
import { ChibiAvatarSvg } from "@/components/apt/chibi-avatar-svg";
import { SupportTrophyIcon } from "@/components/icons/support-trophy-icon";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";

export type SupportRankingEntry = {
  rank: number;
  total: number;
  user?: {
    id: string;
    username: string;
    image: string | null;
    supportTierSent: SupportTierLevel;
  } | null;
  chibiAvatar: ChibiAvatarConfig;
};

const PODIUM = [
  { place: 2, label: "2등", height: "h-24", medal: "bg-slate-300", order: "order-1" },
  { place: 1, label: "1등", height: "h-32", medal: "bg-amber-400", order: "order-2" },
] as const;

function PodiumSlot({
  entry,
  label,
  height,
  medal,
  order,
  delay,
}: {
  entry: SupportRankingEntry | undefined;
  label: string;
  height: string;
  medal: string;
  order: string;
  delay: number;
}) {
  return (
    <motion.div
      className={cn("flex flex-col items-center flex-1 min-w-0", order)}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay }}
    >
      <motion.span
        className="mb-1 text-xs font-display font-bold text-folk-cobalt"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, delay: delay + 0.3 }}
      >
        {label}
      </motion.span>

      {entry?.user ? (
        <Link href={`/u/${entry.user.username}`} className="group flex flex-col items-center min-w-0 w-full">
          <motion.div
            className="relative mb-1"
            animate={{ y: [0, -6, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, delay: delay + 0.2, ease: "easeInOut" }}
          >
            <ChibiAvatarSvg
              config={entry.chibiAvatar}
              celebrate
              holdTrophy
              className="h-[88px] w-[72px] drop-shadow-md group-hover:scale-105 transition-transform"
            />
          </motion.div>
          <DisplayNameWithSupportTier
            name={entry.user.username}
            tier={entry.user.supportTierSent ?? "PEBBLE"}
            compact
            className="text-xs font-semibold truncate max-w-full group-hover:underline"
          />
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatUsd(entry.total)}
          </span>
        </Link>
      ) : (
        <div className="flex flex-col items-center opacity-40 py-4">
          <ChibiAvatarSvg
            config={entry?.chibiAvatar ?? { skinColor: "#f5d0b5", hairColor: "#999", hairStyle: 0, eyeStyle: 0, mouthStyle: 0, topColor: "#ccc", bottomColor: "#aaa", shoeColor: "#888", topStyle: 0, bottomStyle: 0, blush: false }}
            className="h-16 w-14 grayscale"
          />
          <span className="text-xs text-muted-foreground mt-1">—</span>
        </div>
      )}

      <motion.div
        className={cn(
          "mt-2 w-full rounded-t-xl border-2 border-folk-cobalt/25 flex items-end justify-center pb-2",
          height,
          medal
        )}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: delay + 0.15 }}
        style={{ transformOrigin: "bottom" }}
      >
        <span className="text-lg font-display font-black text-white/90 drop-shadow">
          {entry?.rank ?? "—"}
        </span>
      </motion.div>
    </motion.div>
  );
}

export function SupportRankingPodium({ entries }: { entries: SupportRankingEntry[] }) {
  const top2 = [1, 2].map((rank) => entries.find((e) => e.rank === rank));
  const rest = entries.filter((e) => e.rank > 2);

  return (
    <section className="rounded-2xl border-2 border-folk-cobalt/20 bg-gradient-to-b from-folk-gold/10 to-background p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-folk-cobalt/15 bg-folk-cream text-folk-cobalt">
          <SupportTrophyIcon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-display font-bold text-folk-cobalt">후원 랭킹</h2>
          <p className="text-[11px] text-muted-foreground">사이트 전체 누적 후원 TOP</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Kahoot-style podium */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end justify-center gap-2 sm:gap-4 px-1">
            {PODIUM.map((slot, i) => (
              <PodiumSlot
                key={slot.place}
                entry={top2[slot.place - 1]}
                label={slot.label}
                height={slot.height}
                medal={slot.medal}
                order={slot.order}
                delay={i * 0.12}
              />
            ))}
          </div>
        </div>

        {/* Scrollable rest of rankings */}
        <div className="lg:w-44 xl:w-52 shrink-0 rounded-xl border border-border/60 bg-background/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
            <p className="text-xs font-semibold text-folk-cobalt">3위 ~</p>
          </div>
          <div className="max-h-[220px] overflow-y-auto overscroll-contain divide-y divide-border/40">
            {rest.length === 0 ? (
              <p className="p-3 text-[11px] text-muted-foreground text-center">아직 더 많은 랭킹이 없습니다</p>
            ) : (
              rest.map((e) => (
                <div key={e.rank} className="flex items-center gap-2 px-2.5 py-2 text-xs min-w-0">
                  <span className="shrink-0 w-5 font-bold text-muted-foreground tabular-nums">#{e.rank}</span>
                  <ChibiAvatarSvg config={e.chibiAvatar} className="h-8 w-7 shrink-0" />
                  {e.user ? (
                    <Link href={`/u/${e.user.username}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block truncate font-medium">@{e.user.username}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatUsd(e.total)}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
