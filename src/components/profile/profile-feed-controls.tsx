"use client";

import { Film, ImageIcon, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileTab } from "@/components/profile/profile-tab-context";
import type { ProfileMediaKind } from "@/lib/profile-queries";

/** Compact sort links — sits above Create in the tab bar right column. */
export function ProfileSortControls({ className }: { className?: string }) {
  const { tab, sort, navigate } = useProfileTab();

  if (tab !== "posts" && tab !== "media") return null;

  return (
    <div className={cn("flex items-center gap-2 text-xs font-medium", className)}>
      <button
        type="button"
        onClick={() => navigate({ sort: "new" })}
        className={cn(
          "transition-colors",
          sort === "new" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        새로운
      </button>
      <span className="text-border">|</span>
      <button
        type="button"
        onClick={() => navigate({ sort: "popular" })}
        className={cn(
          "transition-colors",
          sort === "popular" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        인기 순
      </button>
    </div>
  );
}

/** Media kind filters only (전체 / 사진 / 비디오). Shown under the tab bar on media tab. */
export function ProfileFeedControls() {
  const { tab, kind, navigate } = useProfileTab();

  if (tab !== "media") return null;

  const setKind = (nextKind: ProfileMediaKind) => navigate({ kind: nextKind });

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border/40 px-4 py-2.5">
      <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
        <button
          type="button"
          onClick={() => setKind("all")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            kind === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          전체
        </button>
        <button
          type="button"
          onClick={() => setKind("photo")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            kind === "photo"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          사진
        </button>
        <button
          type="button"
          onClick={() => setKind("video")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            kind === "video"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Film className="h-3.5 w-3.5" />
          비디오
        </button>
      </div>
    </div>
  );
}
