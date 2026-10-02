"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { getCommunityRoles, assignMemberRole } from "@/actions/community-roles";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { CommunityMemberView } from "@/lib/community-server/types";
import { useQueryClient } from "@tanstack/react-query";

export function MemberRoleAssignSubmenu({
  member,
  communityId,
}: {
  member: CommunityMemberView;
  communityId: string;
}) {
  const [roles, setRoles] = useState<Awaited<ReturnType<typeof getCommunityRoles>>>([]);
  const qc = useQueryClient();

  useEffect(() => {
    void getCommunityRoles(communityId).then(setRoles);
  }, [communityId]);

  async function assign(roleId: string) {
    const res = await assignMemberRole(member.id, roleId);
    if ("error" in res && res.error) alert(res.error);
    else void qc.invalidateQueries({ queryKey: ["community-members", communityId] });
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{t("community-server.sjhhlky")}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {roles.map((r) => (
          <DropdownMenuItem key={r.id} onClick={() => void assign(r.id)}>
            <span style={{ color: r.color ?? undefined }}>{r.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
