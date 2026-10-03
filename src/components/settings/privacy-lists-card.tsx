"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import Link from "next/link";
import { listBlockedUsers, listMutedUsers, type PrivacyListUser } from "@/actions/privacy-lists";
import { toggleMuteUserAction, unblockUserAction } from "@/actions/user-relationship";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { userDisplayName } from "@/lib/user-public-select";

type ListKind = "blocked" | "muted";

export function PrivacyListsCard() {
  const [kind, setKind] = useState<ListKind | null>(null);
  const [users, setUsers] = useState<PrivacyListUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setUsers([]);
    const load = kind === "blocked" ? listBlockedUsers() : listMutedUsers();
    load
      .then((rows) => {
        if (cancelled) return;
        setUsers(rows);
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
  }, [kind]);

  async function removeUser(user: PrivacyListUser) {
    if (!kind || pendingId) return;
    setPendingId(user.id);
    try {
      if (kind === "blocked") {
        const res = await unblockUserAction(user.id, user.username);
        if (res && "error" in res && res.error) return;
      } else {
        const res = await toggleMuteUserAction(user.id, user.username);
        if (res && "error" in res && res.error) return;
        if (res && "muted" in res && res.muted) return;
      }
      setUsers((prev) => prev.filter((row) => row.id !== user.id));
    } finally {
      setPendingId(null);
    }
  }

  const title = kind === "muted" ? t("settings.muted") : t("settings.blocked");
  const empty = kind === "muted" ? t("settings.noMuted") : t("settings.noBlocked");
  const actionLabel = kind === "muted" ? t("settings.unmute") : t("settings.unblock");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.blockedMutedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.blockedMutedDesc")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setKind("blocked")}>
              {t("settings.blocked")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setKind("muted")}>
              {t("settings.muted")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={kind !== null} onOpenChange={(open) => !open && setKind(null)}>
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
              <p className="px-4 py-10 text-center text-sm font-medium text-muted-foreground">{empty}</p>
            ) : (
              <ul>
                {users.map((user) => {
                  const displayName = userDisplayName(user);
                  return (
                    <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                      <Link
                        href={`/u/${user.username}`}
                        onClick={() => setKind(null)}
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={pendingId === user.id}
                        onClick={() => void removeUser(user)}
                      >
                        {actionLabel}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
