"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { SupportTierLevel } from "@prisma/client";
import { SupportTrophyIcon } from "@/components/icons/support-trophy-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";
import { userAvatarFallbackInitial } from "@/lib/user-public-select";

export type SupportRankingEntry = {
  rank: number;
  total: number;
  isDemo?: boolean;
  user?: {
    id: string;
    username: string;
    image: string | null;
    supportTierSent: SupportTierLevel;
  } | null;
};

const PODIUM = [
  { place: 2, label: "2등", height: "h-24", medal: "bg-slate-300", order: "order-1" },
  { place: 1, label: "1등", height: "h-32", medal: "bg-amber-400", order: "order-2" },
] as const;

function RankingAvatar({
  user,
  className,
}: {
  user: NonNullable<SupportRankingEntry["user"]>;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-[72px] w-[72px]", className)}>
      <AvatarImage src={user.image ?? undefined} alt={user.username} />
      <AvatarFallback className="text-lg">{userAvatarFallbackInitial(user)}</AvatarFallback>
    </Avatar>
  );
}

function PodiumProfile({
  entry,
  delay,
}: {
  entry: SupportRankingEntry;
  delay: number;
}) {
  const user = entry.user;
  if (!user) return null;

  const body = (
    <>
      <motion.div
        className="relative mb-1.5"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2.8, delay: delay + 0.2, ease: "easeInOut" }}
      >
        <RankingAvatar user={user} className="drop-shadow-md transition-transform group-hover:scale-105" />
      </motion.div>
      <span className="text-xs font-semibold truncate max-w-full group-hover:underline">
        @{user.username}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums">{formatUsd(entry.total)}</span>
    </>
  );

  if (entry.isDemo) {
    return <div className="flex flex-col items-center min-w-0 w-full">{body}</div>;
  }

  return (
    <Link href={`/u/${user.username}`} className="group flex flex-col items-center min-w-0 w-full">
      {body}
    </Link>
  );
}

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
        <PodiumProfile entry={entry} delay={delay} />
      ) : (
        <div className="flex flex-col items-center opacity-40 py-4">
          <Avatar className="h-16 w-16 grayscale">
            <AvatarFallback>—</AvatarFallback>
          </Avatar>
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

        <div className="lg:w-44 xl:w-52 shrink-0 rounded-xl border border-border/60 bg-background/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
            <p className="text-xs font-semibold text-folk-cobalt">3위 ~</p>
          </div>
          <div className="max-h-[220px] overflow-y-auto overscroll-contain divide-y divide-border/40">
            {rest.length === 0 ? (
              <p className="p-3 text-[11px] text-muted-foreground text-center">아직 더 많은 랭킹이 없습니다</p>
            ) : (
              rest.map((entry) =>
                entry.user ? (
                  entry.isDemo ? (
                    <div key={entry.rank} className="px-3 py-2 text-xs min-w-0">
                      <span className="block truncate font-medium">@{entry.user.username}</span>
                    </div>
                  ) : (
                    <Link
                      key={entry.rank}
                      href={`/u/${entry.user.username}`}
                      className="block px-3 py-2 text-xs min-w-0 hover:bg-muted/40"
                    >
                      <span className="block truncate font-medium hover:underline">@{entry.user.username}</span>
                    </Link>
                  )
                ) : (
                  <div key={entry.rank} className="px-3 py-2 text-xs text-muted-foreground">
                    —
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
