"use client";

import { Film, ImageIcon, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileTab } from "@/components/profile/profile-tab-context";
import type { ProfileMediaKind, ProfileSort } from "@/lib/profile-queries";

const SORT_OPTIONS: { id: ProfileSort; label: string }[] = [
  { id: "new", label: "새로운" },
  { id: "popular", label: "인기 순" },
  { id: "oldest", label: "오래된 순" },
];

/** Compact sort links — sits with Create on the following/followers row. */
export function ProfileSortControls({ className }: { className?: string }) {
  const { tab, sort, navigate, prefetchQuery } = useProfileTab();

  if (tab !== "posts" && tab !== "media") return null;

  return (
    <div className={cn("flex items-center gap-2 text-xs font-medium", className)}>
      {SORT_OPTIONS.map((opt, i) => (
        <span key={opt.id} className="inline-flex items-center gap-2">
          {i > 0 ? <span className="text-border">|</span> : null}
          <button
            type="button"
            onClick={() => navigate({ sort: opt.id })}
            onMouseEnter={() => prefetchQuery({ sort: opt.id })}
            onFocus={() => prefetchQuery({ sort: opt.id })}
            className={cn(
              "transition-colors",
              sort === opt.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        </span>
      ))}
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
 * Renders the glass pill only — parent owns overlay positioning so the
 * 3-col media grid stays edge-to-edge underneath.
 */
export function ProfileFeedControls() {
  const { tab, kind, navigate, prefetchQuery } = useProfileTab();

  if (tab !== "media") return null;

  const setKind = (nextKind: ProfileMediaKind) => navigate({ kind: nextKind });

  return (
    <div className="liquid-glass-wrap min-w-0">
      {/* Neutral color-correction layer — blur samples this instead of raw cream/terracotta */}
      <div aria-hidden className="liquid-glass-tone" />
      <div
        role="tablist"
        aria-label="미디어 종류"
        className="liquid-glass liquid-glass-pill inline-flex max-w-full p-1"
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
              onMouseEnter={() => prefetchQuery({ kind: id })}
              onFocus={() => prefetchQuery({ kind: id })}
              className={cn(
                "liquid-glass-segment inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium sm:px-3.5",
                active && "liquid-glass-segment-active"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
