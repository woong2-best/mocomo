"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { useLocale } from "@/components/providers/locale-provider";
import { userDisplayName } from "@/lib/user-public-select";
import { cn } from "@/lib/utils";
import type { RecommendListItem } from "@/lib/follow-recommendations/types";

type RecItem = RecommendListItem;

function sharedLine(
  item: RecItem,
  commonFollows: string,
  suggested: string
) {
  if (item.sharedLabel) return item.sharedLabel;
  if (item.sharedFollowCount > 0) {
    return commonFollows.replace("{n}", String(item.sharedFollowCount));
  }
  if (item.sharedTags.length) return item.sharedTags.slice(0, 2).join(" · ");
  return suggested;
}

export function WhoToFollowPanel() {
  const { t } = useLocale();
  const session = useSession();
  const signedIn = Boolean(session?.data?.user?.id);
  const [items, setItems] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/follow-recommendations?limit=4", {
        credentials: "same-origin",
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { items?: RecItem[] };
      setItems(data.items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  const track = (candidateId: string, eventType: "CLICK" | "FOLLOW" | "DISMISS") => {
    void fetch("/api/follow-recommendations/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ candidateId, eventType, source: "profile_sidebar" }),
    }).catch(() => {});
  };

  if (!signedIn) return null;

  return (
    <section className="w-full bg-card border-b border-border flex flex-col min-h-0 h-full overflow-hidden">
      <header className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-bold tracking-tight truncate">
          {t("whoToFollow.title")}
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {t("whoToFollow.refresh")}
        </button>
      </header>

      {loading && items.length === 0 ? (
        <ul className="divide-y divide-border overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2 px-2.5 py-2">
              <div className="h-9 w-9 rounded-full bg-muted/60 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3 w-24 bg-muted/60 animate-pulse rounded" />
                <div className="h-2.5 w-16 bg-muted/40 animate-pulse rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : error && items.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">{t("whoToFollow.error")}</p>
      ) : items.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">{t("whoToFollow.empty")}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden">
          {items.map((item) => {
            const displayName = userDisplayName(item);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 hover:bg-muted/40 transition-colors"
                )}
              >
                <Link
                  href={`/u/${item.username}`}
                  className="shrink-0"
                  onClick={() => track(item.id, "CLICK")}
                >
                  <Avatar className="h-9 w-9 ring-1 ring-border/50">
                    <AvatarImage src={item.image ?? undefined} alt="" />
                    <AvatarFallback className="text-xs font-semibold">
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <Link
                  href={`/u/${item.username}`}
                  className="flex-1 min-w-0"
                  onClick={() => track(item.id, "CLICK")}
                >
                  <p className="text-[13px] font-semibold leading-tight truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    @{item.username}
                  </p>
                  <p className="text-[10px] text-muted-foreground/90 truncate mt-0.5 leading-tight">
                    {sharedLine(
                      item,
                      t("whoToFollow.commonFollows"),
                      t("whoToFollow.suggested")
                    )}
                  </p>
                </Link>

                <ProfileFollowButton
                  userId={item.id}
                  username={item.username}
                  initialFollowing={item.viewerFollows}
                  size="sm"
                  className="shrink-0 h-7 px-2.5 text-[11px]"
                  onFollowingChange={(following) => {
                    if (following) {
                      track(item.id, "FOLLOW");
                      setItems((prev) => prev.filter((x) => x.id !== item.id));
                    }
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
