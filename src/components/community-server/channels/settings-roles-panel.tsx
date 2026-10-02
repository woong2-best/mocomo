"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { getCommunityRoles, updateRolePermissions, createCommunityRole } from "@/actions/community-roles";
import { PERMISSION_LABELS, ALL_PERMISSION_KEYS } from "@/lib/community-server/permissions";
import type { CommunityPermissionKey } from "@/lib/community-server/types";

const CHANNEL_PERMISSION_KEYS: CommunityPermissionKey[] = [
  "manageChannels",
  "createChannel",
  "deleteChannel",
  "renameChannel",
  "reorderChannels",
  "lockChannel",
  "setSlowMode",
  "editCategory",
];

const OTHER_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(
  (k) => !CHANNEL_PERMISSION_KEYS.includes(k)
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type RoleRow = Awaited<ReturnType<typeof getCommunityRoles>>[number];

export function CommunityRolesPanel({
  communityId,
  communitySlug: _communitySlug,
}: {
  communityId: string;
  communitySlug: string;
}) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleType, setNewRoleType] = useState<"ADMIN" | "MODERATOR" | "VIP" | "MEMBER">("MEMBER");

  useEffect(() => {
    getCommunityRoles(communityId)
      .then(setRoles)
      .finally(() => setLoading(false));
  }, [communityId]);

  async function togglePerm(roleId: string, key: CommunityPermissionKey, next: boolean) {
    setSaving(roleId);
    const res = await updateRolePermissions(roleId, { [key]: next });
    if (!("error" in res) || !res.error) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, permissions: { ...r.permissions, [key]: next } } : r
        )
      );
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("community-server.s11ly3zo")}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t("community-server.siicr5j")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("community-server.db_moderator_vip")} <strong>{t("lib.community-server.s13oyers")}</strong>{t("community-server.owner_2")}
      </p>
      <ul className="space-y-2">
        {roles.map((role) => (
          <li key={role.id} className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-left"
              onClick={() => setExpanded(expanded === role.id ? null : role.id)}
            >
              <span className="font-medium" style={{ color: role.color ?? undefined }}>
                {role.name}
              </span>
              <span className="text-xs text-muted-foreground">{role.memberCount}명</span>
            </button>
            {expanded === role.id && (
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{t("community-server.szpsc")}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {CHANNEL_PERMISSION_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={role.permissions[key]}
                          disabled={role.type === "OWNER" || saving === role.id}
                          onChange={(e) => void togglePerm(role.id, key, e.target.checked)}
                          className="rounded"
                        />
                        {PERMISSION_LABELS[key]}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{t("lib.webtoon.surv4")}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {OTHER_PERMISSION_KEYS.map((key: CommunityPermissionKey) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={role.permissions[key]}
                          disabled={role.type === "OWNER" || saving === role.id}
                          onChange={(e) => void togglePerm(role.id, key, e.target.checked)}
                          className="rounded"
                        />
                        {PERMISSION_LABELS[key]}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
      >
        {t("community-server.sjhi3h5")}
      </Button>
      {createOpen && (
        <div className="rounded-lg border p-3 space-y-2">
          <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder={t("community-server.sjhh4n1")} />
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={newRoleType}
            onChange={(e) => setNewRoleType(e.target.value as typeof newRoleType)}
          >
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Moderator</option>
            <option value="VIP">VIP</option>
            <option value="MEMBER">Member</option>
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!newRoleName.trim()}
            onClick={() =>
              void createCommunityRole({
                communityId,
                name: newRoleName,
                type: newRoleType,
              }).then((res) => {
                if ("error" in res && res.error) alert(res.error);
                else {
                  setCreateOpen(false);
                  setNewRoleName("");
                  void getCommunityRoles(communityId).then(setRoles);
                }
              })
            }
          >
            {t("community-server.sxv5g")}
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" disabled className="hidden">
        {t("community-server.s14j1cnn")}
      </Button>
    </section>
  );
}
