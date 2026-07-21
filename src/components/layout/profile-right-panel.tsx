"use client";

import { ProfileCalendar } from "@/components/layout/profile-calendar";

/** 프로필(/u/*) 전용 — 달력만 (글쓰기·MONEY는 왼쪽 사이드바) */
export function ProfileRightPanel() {
  return (
    <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-full flex-col folk-panel-aside overflow-y-auto overscroll-contain">
      {/* 달력만 패널 가장자리에 풀블리드로 딱 붙임 */}
      <ProfileCalendar />
    </aside>
  );
}
