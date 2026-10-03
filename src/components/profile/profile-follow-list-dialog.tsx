"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserConnections, type ConnectionUser } from "@/actions/user-connections";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { userDisplayName } from "@/lib/user-public-select";

type FollowListTab = "followers" | "following";

export function ProfileFollowListDialog({
  open,
  onOpenChange,
  username,
  tab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  tab: FollowListTab;
}) {
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    getUserConnections(username, tab)
      .then((data) => {
        if (cancelled) return;
        setUsers(data?.users ?? []);
        setViewerId(data?.viewerId ?? null);
        setProfileUserId(data?.profile.id ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, username, tab]);

  const title =
    tab === "followers"
      ? t("lib.user.connections.s88942fcf78")
      : t("lib.user.connections.s44bb989270");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[78vh] w-[min(100%-2rem,28rem)] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border/60 px-4 py-3.5 pr-12 text-left">
          <DialogTitle className="text-[18px] font-extrabold text-foreground">{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : error ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("settings.listLoadError")}</p>
          ) : users.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm font-medium text-muted-foreground">
              {tab === "followers"
                ? t("lib.user.connections.s5db08156dc")
                : t("lib.user.connections.sf0aa6ceb86")}
            </p>
          ) : (
            <ul>
              {users.map((user) => {
                const displayName = userDisplayName(user);
                const isSelf = viewerId === user.id;
                return (
                  <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                    <Link
                      href={`/u/${user.username}`}
                      onClick={() => onOpenChange(false)}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={user.image ?? undefined} alt="" />
                        <AvatarFallback className="text-sm font-semibold">
                          {displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-extrabold leading-tight">
                          {displayName}
                        </span>
                        <span className="block truncate text-sm font-semibold text-muted-foreground">
                          @{user.username}
                        </span>
                      </span>
                    </Link>
                    {viewerId && !isSelf && profileUserId ? (
                      <ProfileFollowButton
                        userId={user.id}
                        username={user.username}
                        initialFollowing={user.viewerFollows}
                        listOwnerUsername={username}
                        size="sm"
                        className="shrink-0"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
