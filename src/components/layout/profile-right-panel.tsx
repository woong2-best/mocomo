"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { ProfileCalendar } from "@/components/layout/profile-calendar";
import { WhoToFollowPanel } from "@/components/layout/who-to-follow-panel";
import { DiscoveryMatchBadge } from "@/components/discovery/discovery-match-badge";
import { useLocale } from "@/components/providers/locale-provider";

/** 프로필(/u/*) 전용 — 달력 + 팔로우 추천 + 매칭 (스크롤 없음) */
export function ProfileRightPanel() {
  const { t } = useLocale();

  return (
    <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-full flex-col folk-panel-aside overflow-hidden">
      <ProfileCalendar />
      <div className="min-h-0 flex-1 overflow-hidden">
        <WhoToFollowPanel />
      </div>
      <div className="shrink-0 px-3 pb-3 pt-2">
        <Link
          href="/discover"
          className="relative flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>{t("nav.discover")}</span>
          <DiscoveryMatchBadge className="left-auto right-2 top-1/2 -translate-y-1/2" />
        </Link>
      </div>
    </aside>
  );
}
