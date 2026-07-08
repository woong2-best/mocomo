"use client";

import { useEffect, useState } from "react";
import { getCommunityRoles } from "@/actions/community-roles";
import { PERMISSION_LABELS, ALL_PERMISSION_KEYS } from "@/lib/community-server/permissions";
import type { CommunityPermissionKey } from "@/lib/community-server/types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type RoleRow = Awaited<ReturnType<typeof getCommunityRoles>>[number];

export function CommunityRolesPanel({
  communityId,
  communitySlug,
}: {
  communityId: string;
  communitySlug: string;
}) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getCommunityRoles(communityId)
      .then(setRoles)
      .finally(() => setLoading(false));
  }, [communityId]);

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
        Owner · Admin · Moderator · VIP · Member 역할별 권한을 관리합니다.
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
                      disabled={role.type === "OWNER"}
                      readOnly
                      className="rounded"
                    />
                    {PERMISSION_LABELS[key]}
                  </label>
                ))}
                {role.type !== "OWNER" && (
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    권한 수정은 곧 지원됩니다. 현재는 역할 타입별 기본 권한이 적용됩니다.
                  </p>
                )}
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
