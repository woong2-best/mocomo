"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listBlockedUsers, type PrivacyListUser } from "@/actions/privacy-lists";
import { unblockUserAction } from "@/actions/user-relationship";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { userDisplayName } from "@/lib/user-public-select";

const VISIBLE_ROWS = 5;
const ROW_PX = 56;

export function SettingsBlockedUsersCard() {
  const { t } = useLocale();
  const [users, setUsers] = useState<PrivacyListUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void listBlockedUsers()
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
  }, []);

  async function unblock(user: PrivacyListUser) {
    if (pendingId) return;
    setPendingId(user.id);
    try {
      const res = await unblockUserAction(user.id, user.username);
      if (res && "error" in res && res.error) return;
      setUsers((prev) => prev.filter((row) => row.id !== user.id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.blocked")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{t("settings.blockedListDesc")}</p>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("settings.listLoadError")}</p>
        ) : users.length === 0 ? (
          <p className="py-4 text-sm font-medium text-muted-foreground">{t("settings.noBlocked")}</p>
        ) : (
          <ul
            className="overflow-y-auto pr-1"
            style={users.length > VISIBLE_ROWS ? { maxHeight: ROW_PX * VISIBLE_ROWS } : undefined}
          >
            {users.map((user) => {
              const displayName = userDisplayName(user);
              return (
                <li key={user.id} className="flex min-h-14 items-center gap-3 py-1.5">
                  <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-10 w-10">
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
                    onClick={() => void unblock(user)}
                  >
                    {t("settings.unblock")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
