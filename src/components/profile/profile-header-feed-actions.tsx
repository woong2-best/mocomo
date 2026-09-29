"use client";

import { ProfileSortControls } from "@/components/profile/profile-feed-controls";

/** Sort links on the following/followers row. */
export function ProfileHeaderFeedActions() {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <ProfileSortControls />
    </div>
  );
}
