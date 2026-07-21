"use client";

import { ProfileCalendar } from "@/components/layout/profile-calendar";
import { WhoToFollowPanel } from "@/components/layout/who-to-follow-panel";

/** 프로필(/u/*) 전용 — 달력 + 팔로우 추천 (풀블리드) */
export function ProfileRightPanel() {
  return (
    <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-full flex-col folk-panel-aside overflow-y-auto overscroll-contain">
      <ProfileCalendar />
      <WhoToFollowPanel />
    </aside>
  );
}
