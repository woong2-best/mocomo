"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Film, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileTab } from "@/lib/profile-queries";

function buildHref(
  base: string,
  params: URLSearchParams,
  patch: Record<string, string | null>
) {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  const q = next.toString();
  return q ? `${base}?${q}` : base;
}

export function ProfileFeedControls({
  username,
  tab,
}: {
  username: string;
  tab: ProfileTab;
}) {
  const searchParams = useSearchParams();
  const base = `/u/${username}`;
  const sort = searchParams.get("sort") === "popular" ? "popular" : "new";
  const kind = searchParams.get("kind") === "video" ? "video" : "photo";

  if (tab !== "posts" && tab !== "media") return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      {tab === "media" ? (
        <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
          <Link
            href={buildHref(base, searchParams, { tab: "media", kind: "video" })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              kind === "video"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Film className={cn("h-3.5 w-3.5", kind === "video" ? "text-violet-600" : "")} />
            비디오
          </Link>
          <Link
            href={buildHref(base, searchParams, { tab: "media", kind: "photo" })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              kind === "photo"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ImageIcon className={cn("h-3.5 w-3.5", kind === "photo" ? "text-violet-600" : "")} />
            사진
          </Link>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">게시물</span>
      )}

      <div className="flex items-center gap-2 text-xs font-medium">
        <Link
          href={buildHref(base, searchParams, { tab: tab === "posts" ? null : tab, sort: "new" })}
          className={cn(
            "transition-colors",
            sort === "new" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          새로운
        </Link>
        <span className="text-border">|</span>
        <Link
          href={buildHref(base, searchParams, {
            tab: tab === "posts" ? null : tab,
            sort: "popular",
          })}
          className={cn(
            "transition-colors",
            sort === "popular" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          인기 순
        </Link>
      </div>
    </div>
  );
}
