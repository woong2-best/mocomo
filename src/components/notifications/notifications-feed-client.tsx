"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  notificationCategoryForType,
  notificationIcon,
  type NotificationRow,
} from "@/lib/notification-display";
import { markAllNotificationsReadAction, markNotificationRead, deleteAllEconomyNotificationsAction } from "@/actions/notifications";
import { dispatchNotificationsRead } from "@/lib/notification-read-sync";
import { CollabInviteNotificationActions } from "@/components/notifications/collab-invite-notification-actions";
import { isAptPublicEnabled } from "@/lib/apt-public-gate";

const APT_ECONOMY_FILTER_IDS = new Set(["economy", "market", "shop", "flea"]);

const FILTERS: { id: string; label: string; category: string | null }[] = [
  { id: "all", label: "전체", category: null },
  { id: "social", label: "소셜", category: "social" },
  { id: "economy", label: "경제", category: "economy" },
  { id: "market", label: "장터", category: "market" },
  { id: "shop", label: "상점", category: "shop" },
  { id: "flea", label: "벼룩", category: "flea" },
  { id: "live", label: "라이브", category: "live" },
  { id: "fraud", label: "보안", category: "fraud" },
  { id: "system", label: "공지", category: "system" },
  { id: "messages", label: "메시지", category: "messages" },
  { id: "commerce", label: "후원·선물", category: "commerce" },
  { id: "community", label: "커뮤니티", category: "community" },
];

export function NotificationsFeedClient({
  initialNotifications,
  initialUnread,
}: {
  initialNotifications: NotificationRow[];
  initialUnread: number;
}) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const refresh = useCallback(async (category: string | null) => {
    setLoading(true);
    setFetchError(false);
    try {
      const q = category ? `?category=${category}` : "";
      const res = await fetch(`/api/notifications${q}`, { credentials: "include" });
      if (!res.ok) {
        setFetchError(true);
        return;
      }
      const data = (await res.json()) as {
        notifications?: NotificationRow[];
        unread?: number;
      };
      if (Array.isArray(data.notifications)) setItems(data.notifications);
      if (typeof data.unread === "number") setUnread(data.unread);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatchNotificationsRead();
  }, []);

  useEffect(() => {
    const cat = FILTERS.find((f) => f.id === filter)?.category ?? null;
    if (filter === "all" && initialNotifications.length > 0) return;
    void refresh(cat);
  }, [filter, refresh, initialNotifications.length]);

  useEffect(() => {
    const t = setInterval(() => {
      const cat = FILTERS.find((f) => f.id === filter)?.category ?? null;
      void refresh(cat);
    }, 45000);
    return () => clearInterval(t);
  }, [filter, refresh]);

  async function onItemClick(id: string, read: boolean, source?: "social" | "apt") {
    if (!read) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationRead(id, source ?? "social");
    }
  }

  const visibleFilters = FILTERS.filter(
    (f) => isAptPublicEnabled() || !APT_ECONOMY_FILTER_IDS.has(f.id)
  );

  const visibleItems = isAptPublicEnabled()
    ? items
    : items.filter((n) => n.source !== "apt");

  const filtered =
    filter === "all"
      ? visibleItems
      : filter === "economy"
        ? visibleItems.filter((n) => n.source === "apt")
        : visibleItems.filter((n) => notificationCategoryForType(n.type) === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {visibleFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isAptPublicEnabled() && filter === "economy" && items.some((n) => n.source === "apt") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void deleteAllEconomyNotificationsAction().then(() => {
                setItems((prev) => prev.filter((n) => n.source !== "apt"));
              });
            }}
          >
            경제 알림 삭제
          </Button>
        )}
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUnread(0);
                setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                dispatchNotificationsRead();
              }}
            >
              모두 읽음
            </Button>
          </form>
        )}
      </div>

      {fetchError ? (
        <div className="rounded-2xl border border-dashed p-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">알림을 불러오지 못했습니다.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              const cat = FILTERS.find((f) => f.id === filter)?.category ?? null;
              void refresh(cat);
            }}
          >
            다시 시도
          </Button>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="space-y-2 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3 animate-pulse">
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted/80" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {filter === "all"
            ? "알림이 없습니다. 좋아요·댓글·팔로우·쪽지 활동이 여기에 표시됩니다."
            : "이 카테고리에 알림이 없습니다."}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
          {filtered.map((n) => {
            const { Icon, className: iconClass } = notificationIcon(n.type);
            const href = n.link ?? "#";
            const inner = (
              <div
                className={cn(
                  "flex gap-3 p-4 transition-colors hover:bg-muted/40",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11">
                    {n.actor?.image ? (
                      <AvatarImage src={n.actor.image} alt="" />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {(n.actor?.username ?? n.title).slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border",
                      iconClass
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.read && "font-semibold")}>
                    <span className="text-foreground">{n.title}</span>
                    {n.body ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {n.body}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(
                      typeof n.createdAt === "string"
                        ? new Date(n.createdAt)
                        : n.createdAt,
                      { addSuffix: true, locale: ko }
                    )}
                  </p>
                  {n.type === "post_collab_invite" ? (
                    <CollabInviteNotificationActions link={n.link} />
                  ) : null}
                </div>
                {!n.read && (
                  <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-2" />
                )}
              </div>
            );

            return (
              <li key={`${n.source ?? "social"}-${n.id}`}>
                {n.link ? (
                  <Link
                    href={href}
                    onClick={() => void onItemClick(n.id, n.read, n.source ?? "social")}
                    className="block"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => void onItemClick(n.id, n.read, n.source ?? "social")}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
