"use client";

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
        <DropdownMenuItem onClick={() => void run(() => kickCommunityMember(member.id))}>
          추방
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void run(() => timeoutCommunityMember(member.id, 10))}
        >
          타임아웃 (10분)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void run(() => timeoutCommunityMember(member.id, 60))}
        >
          타임아웃 (1시간)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            if (!confirm(`${member.username}님을 차단할까요?`)) return;
            void run(() => banCommunityMember(member.id, { reason: "관리자 차단" }));
          }}
        >
          영구 차단
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
