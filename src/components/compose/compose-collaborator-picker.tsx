"use client";

import { useEffect, useState, useTransition } from "react";
import { Users, X, Search, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type CollabPickerUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  isFollowing: boolean;
};

type Props = {
  selected: CollabPickerUser[];
  onChange: (users: CollabPickerUser[]) => void;
  max?: number;
  disabled?: boolean;
  labels?: {
    add?: string;
    search?: string;
    following?: string;
    maxReached?: string;
    selected?: string;
  };
};

export function ComposeCollaboratorPicker({
  selected,
  onChange,
  max = 10,
  disabled,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CollabPickerUser[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => {
        try {
          const res = await fetch(
            `/api/users/collab-search?q=${encodeURIComponent(q)}`,
            { credentials: "include" }
          );
          const data = (await res.json()) as { users?: CollabPickerUser[] };
          setHits(Array.isArray(data.users) ? data.users : []);
        } catch {
          setHits([]);
        }
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  function toggle(user: CollabPickerUser) {
    const exists = selected.some((s) => s.id === user.id);
    if (exists) {
      onChange(selected.filter((s) => s.id !== user.id));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, user]);
  }

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-1.5 rounded-full"
          >
            <Users className="h-3.5 w-3.5" />
            {labels?.add ?? "공동작업자 추가"}
            {selected.length > 0 ? ` (${selected.length}/${max})` : ""}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{labels?.add ?? "공동작업자 추가"}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels?.search ?? "닉네임, 아이디, UID 검색"}
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
              autoFocus
            />
          </div>
          {selected.length >= max && (
            <p className="text-xs text-muted-foreground">
              {labels?.maxReached ?? `최대 ${max}명까지 초대할 수 있습니다.`}
            </p>
          )}
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {pending && hits.length === 0 ? (
              <li className="px-2 py-4 text-center text-sm text-muted-foreground">
                …
              </li>
            ) : null}
            {hits.map((u) => {
              const isSelected = selected.some((s) => s.id === u.id);
              const atMax = !isSelected && selected.length >= max;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={atMax}
                    onClick={() => toggle(u)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                      isSelected ? "bg-primary/10" : "hover:bg-muted/60",
                      atMax && "opacity-50"
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback>
                        {userDisplayName(u)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <DisplayNameWithSupportTier
                        name={userDisplayName(u)}
                        tier={u.supportTierSent ?? "PEBBLE"}
                        className="text-sm font-medium"
                      />
                      <p className="truncate text-xs text-muted-foreground">
                        @{u.username}
                        {u.isFollowing
                          ? ` · ${labels?.following ?? "팔로잉"}`
                          : ""}
                      </p>
                    </div>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((u) => (
            <li
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 py-0.5 pl-0.5 pr-2 text-xs"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={u.image ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {userDisplayName(u)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate">@{u.username}</span>
              <button
                type="button"
                aria-label="remove"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => onChange(selected.filter((s) => s.id !== u.id))}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
