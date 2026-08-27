"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  deleteChannelPermissionOverride,
  getChannelPermissionManageBundle,
  upsertChannelPermissionOverride,
} from "@/actions/community-channel-permissions";
import {
  CHANNEL_OVERRIDE_PERMISSION_KEYS,
  channelOverrideLabel,
} from "@/lib/community-server/channel-override-keys";
import type { CommunityPermissionKey } from "@/lib/community-server/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type RoleOption = {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
};

type OverrideRow = {
  id: string;
  targetType: "ROLE" | "USER";
  targetId: string;
  allow: Partial<Record<CommunityPermissionKey, boolean>>;
  deny: Partial<Record<CommunityPermissionKey, boolean>>;
};

function OverrideEditor({
  allow,
  deny,
  onAllowChange,
  onDenyChange,
}: {
  allow: Partial<Record<CommunityPermissionKey, boolean>>;
  deny: Partial<Record<CommunityPermissionKey, boolean>>;
  onAllowChange: (key: CommunityPermissionKey, val: boolean) => void;
  onDenyChange: (key: CommunityPermissionKey, val: boolean) => void;
}) {
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded-lg p-2">
      {CHANNEL_OVERRIDE_PERMISSION_KEYS.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0"
        >
          <span className="text-sm">{channelOverrideLabel(key)}</span>
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-1 text-xs text-emerald-600">
              <input
                type="checkbox"
                checked={allow[key] === true}
                onChange={(e) => onAllowChange(key, e.target.checked)}
              />
              허용
            </label>
            <label className="flex items-center gap-1 text-xs text-red-600">
              <input
                type="checkbox"
                checked={deny[key] === true}
                onChange={(e) => onDenyChange(key, e.target.checked)}
              />
              거부
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChannelPermissionOverridesDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [draftAllow, setDraftAllow] = useState<
    Partial<Record<CommunityPermissionKey, boolean>>
  >({});
  const [draftDeny, setDraftDeny] = useState<
    Partial<Record<CommunityPermissionKey, boolean>>
  >({});

  const roleLabel = useCallback(
    (roleId: string) => {
      const r = roles.find((x) => x.id === roleId);
      if (!r) return roleId;
      return r.isDefault ? `@everyone (${r.name})` : r.name;
    },
    [roles]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getChannelPermissionManageBundle(channelId);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setRoles(res.roles);
    setOverrides(res.overrides);
    const first = res.roles[0]?.id ?? "";
    setSelectedRoleId(first);
    const existing = res.overrides.find(
      (o) => o.targetType === "ROLE" && o.targetId === first
    );
    setDraftAllow(existing?.allow ?? {});
    setDraftDeny(existing?.deny ?? {});
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!selectedRoleId) return;
    const existing = overrides.find(
      (o) => o.targetType === "ROLE" && o.targetId === selectedRoleId
    );
    setDraftAllow(existing?.allow ?? {});
    setDraftDeny(existing?.deny ?? {});
  }, [selectedRoleId, overrides]);

  const rolesWithoutOverride = useMemo(
    () =>
      roles.filter(
        (r) => !overrides.some((o) => o.targetType === "ROLE" && o.targetId === r.id)
      ),
    [roles, overrides]
  );

  async function saveRoleOverride() {
    if (!selectedRoleId) return;
    setSaving(true);
    setError("");
    const res = await upsertChannelPermissionOverride({
      channelId,
      targetType: "ROLE",
      targetId: selectedRoleId,
      allow: draftAllow,
      deny: draftDeny,
    });
    if ("error" in res && res.error) setError(res.error);
    else await load();
    setSaving(false);
  }

  async function removeOverride(id: string) {
    setSaving(true);
    const res = await deleteChannelPermissionOverride(id);
    if ("error" in res && res.error) setError(res.error);
    else await load();
    setSaving(false);
  }

  function toggleAllow(key: CommunityPermissionKey, val: boolean) {
    setDraftAllow((prev) => {
      const next = { ...prev };
      if (val) next[key] = true;
      else delete next[key];
      return next;
    });
    if (val) {
      setDraftDeny((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function toggleDeny(key: CommunityPermissionKey, val: boolean) {
    setDraftDeny((prev) => {
      const next = { ...prev };
      if (val) next[key] = true;
      else delete next[key];
      return next;
    });
    if (val) {
      setDraftAllow((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>채널 권한 — #{channelName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          역할별 allow/deny 덮어쓰기. 오너·관리자(administrator)는 항상 우회됩니다.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            불러오는 중…
          </div>
        ) : (
          <div className="space-y-4">
            {overrides.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  적용 중인 덮어쓰기
                </p>
                <ul className="space-y-1">
                  {overrides.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                    >
                      <span className="truncate">
                        {o.targetType === "ROLE" ? roleLabel(o.targetId) : `유저 ${o.targetId}`}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        disabled={saving}
                        onClick={() => void removeOverride(o.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">역할 선택</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.isDefault ? `@everyone — ${r.name}` : `${r.name} (${r.type})`}
                  </option>
                ))}
              </select>
            </div>

            <OverrideEditor
              allow={draftAllow}
              deny={draftDeny}
              onAllowChange={toggleAllow}
              onDenyChange={toggleDeny}
            />

            <Button type="button" disabled={saving || !selectedRoleId} onClick={() => void saveRoleOverride()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
            </Button>

            {rolesWithoutOverride.length > 0 && (
              <p className="text-xs text-muted-foreground">
                아직 override가 없는 역할:{" "}
                {rolesWithoutOverride.map((r) => r.name).join(", ")}
              </p>
            )}
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
