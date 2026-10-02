"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  kickCommunityMember,
  banCommunityMember,
  timeoutCommunityMember,
} from "@/actions/community-moderation";
import type { CommunityMemberView } from "@/lib/community-server/types";
import { useQueryClient } from "@tanstack/react-query";
import { MemberRoleAssignSubmenu } from "@/components/community-server/member-role-assign";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { hasPermission } from "@/lib/community-server/permissions";

export function MemberModerationMenu({
  member,
  communityId,
  children,
}: {
  member: CommunityMemberView;
  communityId: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function run(action: () => Promise<{ error?: string; success?: boolean }>) {
    setLoading(true);
    const res = await action();
    if ("error" in res && res.error) alert(res.error);
    else void qc.invalidateQueries({ queryKey: ["community-members", communityId] });
    setLoading(false);
  }

  const { permissions } = useCommunityMembership();
  const canAssign =
    hasPermission(permissions, "assignAdmin") ||
    hasPermission(permissions, "assignModerator") ||
    hasPermission(permissions, "assignVip") ||
    hasPermission(permissions, "assignOwner") ||
    hasPermission(permissions, "manageRoles");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        {loading ? (
          <span className="p-1">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        ) : (
          children
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canAssign && !member.isOwner && (
          <MemberRoleAssignSubmenu member={member} communityId={communityId} />
        )}
        <DropdownMenuItem onClick={() => void run(() => kickCommunityMember(member.id))}>
          {t("community-server.s1000l")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void run(() => timeoutCommunityMember(member.id, 10))}
        >
          {t("community-server.s1yi3hu7")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void run(() => timeoutCommunityMember(member.id, 60))}
        >
          {t("community-server.s9eypn")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            if (!confirm(t("community-server.s12kq8ej", { v0: member.username }))) return;
            void run(() => banCommunityMember(member.id, { reason: t("community-server.s1jybapo") }));
          }}
        >
          {t("community-server.ser2y5x")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
