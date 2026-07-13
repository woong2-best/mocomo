"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileTab } from "@/lib/profile-queries";
import { ProfileCreatePanel } from "@/components/profile/profile-create-panel";
import { ProfileFeedControls } from "@/components/profile/profile-feed-controls";
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

  return (
    <>
      <div className="sticky top-[var(--profile-compact-h)] z-20 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <nav className="flex items-stretch">
          <div className="flex min-w-0 flex-1">
            {tabs.filter((t) => showLikesTab || t.id !== "likes").map((t) => {
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate({ tab: t.id })}
                  className={cn(
                    "relative min-w-0 flex-1 py-4 text-center text-sm font-medium transition-colors hover:bg-muted/40",
                    isActive && "font-bold"
                  )}
                >
                  {t.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
          {isSelf && (
            <div className="flex shrink-0 items-center border-l border-border/60 px-3">
              <Button
                type="button"
                size="sm"
                variant={createOpen ? "secondary" : "default"}
                className="h-9 gap-1.5 rounded-full px-4"
                onClick={() => setCreateOpen((v) => !v)}
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          )}
        </nav>

        <ProfileFeedControls />
      </div>

      {isSelf && (
        <ProfileCreatePanel open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </>
  );
}
