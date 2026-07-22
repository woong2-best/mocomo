"use client";

import { cn } from "@/lib/utils";
import type { ProfileTab } from "@/lib/profile-queries";
import { ProfileFeedControls } from "@/components/profile/profile-feed-controls";
import { useProfileTab } from "@/components/profile/profile-tab-context";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "게시물" },
  { id: "replies", label: "답글" },
  { id: "media", label: "미디어" },
  { id: "wiki", label: "위키" },
  { id: "likes", label: "좋아요" },
];

export function ProfileTabs({
  showLikesTab = false,
}: {
  showLikesTab?: boolean;
  /** @deprecated Create moved to followers row — kept for call-site compat */
  isSelf?: boolean;
}) {
  const { tab: active, navigate } = useProfileTab();
  const isMedia = active === "media";

  return (
    <div className="sticky top-[var(--profile-compact-h)] z-20">
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
  );
}
