"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { ProfileFollowListDialog } from "@/components/profile/profile-follow-list-dialog";

type FollowListTab = "followers" | "following";

export function ProfileFollowCounts({
  username,
  followingCount,
  followerCount,
}: {
  username: string;
  followingCount: number;
  followerCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FollowListTab>("followers");

  function openList(next: FollowListTab) {
    setTab(next);
    setOpen(true);
  }

  return (
    <>
      <div className="flex shrink-0 gap-4 text-sm">
        <button type="button" className="hover:underline" onClick={() => openList("following")}>
          <span className="font-bold text-foreground">{followingCount}</span>{" "}
          <span className="text-muted-foreground">{t("lib.user.connections.s44bb989270")}</span>
        </button>
        <button type="button" className="hover:underline" onClick={() => openList("followers")}>
          <span className="font-bold text-foreground">{followerCount}</span>{" "}
          <span className="text-muted-foreground">{t("lib.user.connections.s88942fcf78")}</span>
        </button>
      </div>
      <ProfileFollowListDialog
        open={open}
        onOpenChange={setOpen}
        username={username}
        tab={tab}
      />
    </>
  );
}
