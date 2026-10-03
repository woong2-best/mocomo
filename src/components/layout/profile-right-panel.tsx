"use client";

import { ProfileCalendar } from "@/components/layout/profile-calendar";
import { WhoToFollowPanel } from "@/components/layout/who-to-follow-panel";

/** Profile pages — calendar plus follow suggestions. */
export function ProfileRightPanel() {
  return (
    <aside className="folk-panel-aside hidden h-full min-h-0 w-56 shrink-0 flex-col overflow-hidden lg:flex xl:w-60">
      <ProfileCalendar />
      <div className="min-h-0 flex-1 overflow-hidden">
        <WhoToFollowPanel />
      </div>
    </aside>
  );
}
