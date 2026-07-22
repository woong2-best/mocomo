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

const KIND_OPTIONS: {
  id: ProfileMediaKind;
  label: string;
  Icon: typeof LayoutGrid;
}[] = [
  { id: "all", label: "전체", Icon: LayoutGrid },
  { id: "photo", label: "사진", Icon: ImageIcon },
  { id: "video", label: "비디오", Icon: Film },
];

/**
 * Media kind filters (전체 / 사진 / 비디오).
 * Neutral tone underlay + milky glass so warm page colors don't stain the pill.
 */
export function ProfileFeedControls() {
  const { tab, kind, navigate } = useProfileTab();

  if (tab !== "media") return null;

  const setKind = (nextKind: ProfileMediaKind) => navigate({ kind: nextKind });

  return (
    <div className="relative z-10 -mb-10 px-4 pb-2 pt-2">
      <div className="liquid-glass-wrap">
        {/* Neutral color-correction layer — blur samples this instead of raw cream/terracotta */}
        <div aria-hidden className="liquid-glass-tone" />
        <div
          role="tablist"
          aria-label="미디어 종류"
          className="liquid-glass liquid-glass-pill inline-flex p-1"
        >
          {KIND_OPTIONS.map(({ id, label, Icon }) => {
            const active = kind === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKind(id)}
                className={cn(
                  "liquid-glass-segment inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:px-4",
                  active && "liquid-glass-segment-active"
                )}
              >
                <Icon className="h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
