"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { CommunityRoleType } from "@prisma/client";
import { assignMemberRole } from "@/actions/community-roles";
import type { CommunityMemberView } from "@/lib/community-server/types";
import { ROLE_GROUP_LABELS } from "@/lib/community-server/rbac-defaults";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MemberRoleAddDialog({
  open,
  onOpenChange,
  communityId,
  roleType,
  roleId,
  roleName,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  roleType: CommunityRoleType;
  roleId: string;
  roleName: string;
  members: CommunityMemberView[];
}) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const hasRole = m.roles.some((r) => r.id === roleId);
      if (hasRole) return false;
      if (!q) return true;
      const name = (m.nickname ?? m.name ?? m.username).toLowerCase();
      return name.includes(q) || m.username.toLowerCase().includes(q);
    });
  }, [members, query, roleId]);

  async function assign(memberId: string) {
    setAssigningId(memberId);
    setError("");
    const res = await assignMemberRole(memberId, roleId);
    if ("error" in res && res.error) {
      setError(res.error);
      setAssigningId(null);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["community-members", communityId] });
    setAssigningId(null);
    onOpenChange(false);
    setQuery("");
  }

  const groupLabel = ROLE_GROUP_LABELS[roleType] ?? roleName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{groupLabel}에 멤버 추가</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          커뮤니티 멤버에게 <span className="font-medium text-foreground">{roleName}</span>{" "}
          역할을 부여합니다.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 또는 @username 검색"
            className="pl-9"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
          {candidates.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              추가할 수 있는 멤버가 없습니다.
            </li>
          ) : (
            candidates.map((m) => {
              const display = m.nickname ?? m.name ?? m.username;
              const busy = assigningId === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void assign(m.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/80 disabled:opacity-50"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={m.image ?? undefined} />
                      <AvatarFallback>{m.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{display}</p>
                      <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                    </div>
                    {busy && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
