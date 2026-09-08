"use client";

import { useCallback, useEffect, useState } from "react";
import type { BroadcastRole } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BroadcastRoleBadge } from "@/components/live/broadcast-role-badge";
import { broadcastRoleLabelKo, type EffectiveBroadcastRole } from "@/lib/live-broadcast/permissions";
import {
  assignBroadcastRoleAction,
  removeBroadcastRoleAction,
} from "@/actions/broadcast-roles";
import { Loader2, Search, Trash2 } from "lucide-react";

type RoleMember = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  role: EffectiveBroadcastRole;
};

type SearchHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  currentRole: EffectiveBroadcastRole;
};

type RoleLog = {
  id: string;
  at: string;
  actorUsername: string;
  targetUsername: string;
  action: string;
  oldRole: BroadcastRole | null;
  newRole: BroadcastRole | null;
};

export function LiveRoleManagementPanel({ channelId }: { channelId: string }) {
  const [members, setMembers] = useState<RoleMember[]>([]);
  const [logs, setLogs] = useState<RoleLog[]>([]);
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [selectedRole, setSelectedRole] = useState<BroadcastRole>("MANAGER");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<BroadcastRole[]>(["MANAGER", "MODERATOR", "VIP"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/live/${channelId}/roles`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      setMembers(data.members ?? []);
      setLogs(data.logs ?? []);
      const perms: string[] = data.permissions ?? [];
      setAssignableRoles(
        perms.includes("roles.manage")
          ? ["MANAGER", "MODERATOR", "VIP"]
          : ["MODERATOR", "VIP"]
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/live/${channelId}/roles/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok) {
          setSearchHits(data.users ?? []);
          if (data.assignableRoles?.length) {
            setAssignableRoles(data.assignableRoles);
            if (!data.assignableRoles.includes(selectedRole)) {
              setSelectedRole(data.assignableRoles[0]);
            }
          }
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [query, channelId, selectedRole]);

  async function saveRole() {
    if (!selectedUserId) return;
    setSaving(true);
    setError("");
    setMessage("");
    const res = await assignBroadcastRoleAction(channelId, selectedUserId, selectedRole);
    setSaving(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setMessage("역할이 저장되었습니다.");
    setQuery("");
    setSelectedUserId(null);
    void load();
  }

  async function removeRole(userId: string) {
    setSaving(true);
    setError("");
    const res = await removeBroadcastRoleAction(channelId, userId);
    setSaving(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    void load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">사용자 추가</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="사용자 ID 또는 닉네임 검색"
            className="pl-9"
          />
        </div>
        {searchHits.length > 0 && (
          <div className="mt-2 border border-border/60 rounded-lg divide-y divide-border/40 max-h-48 overflow-y-auto">
            {searchHits.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50 ${selectedUserId === u.id ? "bg-muted" : ""}`}
                onClick={() => setSelectedUserId(u.id)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={u.image ?? undefined} />
                  <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">@{u.username}</p>
                  {u.name && <p className="text-xs text-muted-foreground truncate">{u.name}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    현재 역할: {broadcastRoleLabelKo(u.currentRole)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as BroadcastRole)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="역할 선택" />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((r) => (
                <SelectItem key={r} value={r}>
                  {broadcastRoleLabelKo(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!selectedUserId || saving} onClick={() => void saveRole()}>
            저장
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div>
        <h3 className="text-sm font-semibold mb-2">현재 역할</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-2 p-2 rounded-lg border border-border/60"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={m.image ?? undefined} />
                <AvatarFallback>{m.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">@{m.username}</span>
                  <BroadcastRoleBadge role={m.role} size={18} />
                </div>
                <p className="text-[11px] text-muted-foreground">{broadcastRoleLabelKo(m.role)}</p>
              </div>
              {m.role !== "OWNER" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={saving}
                  onClick={() => void removeRole(m.userId)}
                  aria-label="역할 제거"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {logs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">변경 기록</h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs text-muted-foreground">
            {logs.map((log) => (
              <p key={log.id}>
                {new Date(log.at).toLocaleString("ko-KR")} · @{log.actorUsername} → @
                {log.targetUsername}
                {log.action === "REMOVE"
                  ? ` · ${log.oldRole ? broadcastRoleLabelKo(log.oldRole) : ""} 제거`
                  : log.newRole
                    ? ` · ${broadcastRoleLabelKo(log.newRole)} 지정`
                    : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
