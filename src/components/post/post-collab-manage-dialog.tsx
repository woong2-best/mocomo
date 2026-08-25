"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { SupportTierLevel } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type CollabUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  isFollowing?: boolean;
};

type CollabRow = {
  id: string;
  userId: string;
  status: string;
  user: CollabUser;
};

export function PostCollabManageDialog({
  postId,
  triggerClassName,
}: {
  postId: string;
  triggerClassName?: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CollabRow[]>([]);
  const [max, setMax] = useState(10);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CollabUser[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function reload() {
    start(async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/collaborators`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          collaborators?: CollabRow[];
          max?: number;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? t("collab.actionFailed"));
          return;
        }
        setRows(data.collaborators ?? []);
        if (typeof data.max === "number") setMax(data.max);
      } catch {
        setError(t("collab.actionFailed"));
      }
    });
  }

  useEffect(() => {
    if (open) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      start(async () => {
        try {
          const res = await fetch(
            `/api/users/collab-search?q=${encodeURIComponent(q)}`,
            { credentials: "include" }
          );
          const data = (await res.json()) as { users?: CollabUser[] };
          setHits(Array.isArray(data.users) ? data.users : []);
        } catch {
          setHits([]);
        }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  async function invite(userId: string) {
    setError("");
    const res = await fetch(`/api/posts/${postId}/collaborators`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [userId] }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? t("collab.actionFailed"));
      return;
    }
    setQuery("");
    setHits([]);
    reload();
    router.refresh();
  }

  async function remove(userId: string) {
    setError("");
    const res = await fetch(`/api/posts/${postId}/collaborators/${userId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? t("collab.actionFailed"));
      return;
    }
    reload();
    router.refresh();
  }

  const activeCount = rows.filter(
    (r) => r.status === "PENDING" || r.status === "ACCEPTED"
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground",
            triggerClassName
          )}
        >
          <Users className="h-3.5 w-3.5" />
          {t("collab.manage")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("collab.manage")} ({activeCount}/{max})
          </DialogTitle>
        </DialogHeader>

        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={r.user.image ?? undefined} />
                <AvatarFallback>
                  {userDisplayName(r.user)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{userDisplayName(r.user)}</p>
                <p className="text-[11px] text-muted-foreground">
                  @{r.user.username} · {r.status}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
                title={t("collab.remove")}
                onClick={() => void remove(r.userId)}
              >
                <UserMinus className="h-4 w-4" />
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-sm text-muted-foreground px-2 py-3 text-center">
              —
            </li>
          )}
        </ul>

        {activeCount < max && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("compose.collabSearch")}
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {hits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void invite(u.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/60"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback>
                        {userDisplayName(u)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <DisplayNameWithSupportTier
                        name={userDisplayName(u)}
                        tier={u.supportTierSent ?? "SEED"}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        @{u.username}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
