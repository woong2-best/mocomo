"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileTab } from "@/lib/profile-queries";
import { useSuspendedAccount } from "@/hooks/use-suspended-account";
import { ProfileCreatePanel } from "@/components/profile/profile-create-panel";
import {
  ProfileFeedControls,
  ProfileSortControls,
} from "@/components/profile/profile-feed-controls";
import { useProfileTab } from "@/components/profile/profile-tab-context";
import { Button } from "@/components/ui/button";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "게시물" },
  { id: "replies", label: "답글" },
  { id: "media", label: "미디어" },
  { id: "wiki", label: "위키" },
  { id: "likes", label: "좋아요" },
];

export function ProfileTabs({
  showLikesTab = false,
  isSelf = false,
}: {
  showLikesTab?: boolean;
  isSelf?: boolean;
}) {
  const { tab: active, navigate } = useProfileTab();
  const [createOpen, setCreateOpen] = useState(false);
  const { suspended, blockAction } = useSuspendedAccount();
  const showSort = active === "posts" || active === "media";
  const isMedia = active === "media";
  const showToolbar = isSelf || showSort;

  return (
    <>
      <div className="sticky top-[var(--profile-compact-h)] z-20">
        {/* Sort + Create sit ABOVE the tab rail (게시물/미디어/위키/좋아요) */}
        {showToolbar ? (
          <div className="flex items-center justify-end gap-2 border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            <ProfileSortControls />
            {isSelf ? (
              <Button
                type="button"
                size="sm"
                variant={createOpen ? "secondary" : "default"}
                className="h-8 gap-1 rounded-full px-3 shadow-sm"
                disabled={suspended}
                onClick={() => {
                  if (blockAction("post")) return;
                  setCreateOpen((v) => !v);
                }}
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Full-width tabs — sticks under compact profile header for the whole feed */}
        <div className="border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
          <nav className="flex w-full items-stretch" aria-label="프로필 탭">
            {tabs.filter((t) => showLikesTab || t.id !== "likes").map((t) => {
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate({ tab: t.id })}
                  className={cn(
                    "relative min-w-0 flex-1 py-3.5 text-center text-sm font-medium transition-colors hover:bg-muted/40",
                    isActive ? "font-bold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t.label}
                  {isActive ? (
                    <span
                      className="absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Media kind filter overlays the grid — no hollow bar under tabs */}
        {isMedia ? (
          <div className="relative z-10 -mb-11 flex items-center px-3 pt-2 pb-1">
            <ProfileFeedControls />
          </div>
        ) : null}
      </div>

      {isSelf && (
        <ProfileCreatePanel open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </>
  );
}
