"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { History, Radio, Trophy, Users } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { countByStatus } from "@/lib/minigames/registry";
import { useLocale } from "@/components/providers/locale-provider";

export function GamesHubStats() {
  const { t } = useLocale();
  const liveCount = countByStatus("live") + countByStatus("beta");
  const soonCount = countByStatus("coming_soon");

  const quickLinks = [
    { href: "/games/ranking", label: t("games.ranking"), icon: Trophy },
    { href: "/games/history", label: t("games.history"), icon: History },
    { href: "/games/live", label: t("games.spectate"), icon: Radio },
  ] as const;

  return (
    <PageSection
      title={t("games.hubTitle")}
      description={t("games.hubDesc")}
      variant="card"
      className="!p-4"
    >
      <div className="flex flex-wrap gap-2 text-xs mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 px-2.5 py-1 font-medium">
          <Radio className="h-3 w-3" />
          {t("games.playable", { count: String(liveCount) })}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
          {t("games.comingSoon", { count: String(soonCount) })}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-folk-gold/20 text-folk-cobalt px-2.5 py-1">
          <Users className="h-3 w-3" />
          {t("games.friendRoom")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {quickLinks.map(({ href, label, icon: Icon }) => (
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
