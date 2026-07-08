"use client";

import { useEffect, useState } from "react";
import { getCommunityRoles, updateRolePermissions } from "@/actions/community-roles";
import { PERMISSION_LABELS, ALL_PERMISSION_KEYS } from "@/lib/community-server/permissions";
import type { CommunityPermissionKey } from "@/lib/community-server/types";
import { Button } from "@/components/ui/button";
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
        역할 로딩...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">역할 & 권한</h2>
      <p className="text-sm text-muted-foreground">
        역할별 권한을 DB에 저장합니다. Owner 역할은 수정할 수 없습니다.
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
              <div className="px-4 pb-4 grid sm:grid-cols-2 gap-2 border-t border-border pt-3">
                {ALL_PERMISSION_KEYS.map((key: CommunityPermissionKey) => (
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
            )}
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" disabled>
        역할 추가 (준비 중)
      </Button>
    </section>
  );
}
