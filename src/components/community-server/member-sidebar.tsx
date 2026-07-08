"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityPresenceStatus } from "@prisma/client";
import type { CommunityMemberView } from "@/lib/community-server/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunityMembers } from "@/hooks/use-community-members";

const PRESENCE_ORDER: CommunityPresenceStatus[] = ["ONLINE", "IDLE", "DND", "OFFLINE"];
const PRESENCE_LABELS: Record<CommunityPresenceStatus, string> = {
  ONLINE: "온라인",
  IDLE: "자리비움",
  DND: "방해금지",
  OFFLINE: "오프라인",
};
const PRESENCE_DOT: Record<CommunityPresenceStatus, string> = {
  ONLINE: "bg-emerald-500",
  IDLE: "bg-amber-400",
  DND: "bg-red-500",
  OFFLINE: "bg-muted-foreground/40",
};

function MemberRow({ member }: { member: CommunityMemberView }) {
  const displayName = member.nickname ?? member.username;
  const topRole = member.roles[0];

  return (
    <Link
      href={`/u/${member.username}`}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/80 group"
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.image ?? undefined} />
          <AvatarFallback>{member.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
            PRESENCE_DOT[member.presence]
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-sm truncate font-medium"
          style={topRole?.color ? { color: topRole.color } : undefined}
        >
          {displayName}
        </p>
        {topRole && (
          <p className="text-[10px] text-muted-foreground truncate">{topRole.name}</p>
        )}
      </div>
      {member.isOwner && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
    </Link>
  );
}

export function MemberSidebar({
  communityId,
  initialMembers,
}: {
  communityId: string;
  initialMembers?: CommunityMemberView[];
}) {
  const { data: members = [] } = useCommunityMembers(communityId, initialMembers);

  const grouped = PRESENCE_ORDER.map((status) => ({
    status,
    label: PRESENCE_LABELS[status],
    items: members.filter((m) => m.presence === status),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="hidden xl:flex flex-col w-56 shrink-0 bg-muted/20 border-l border-border/60 h-full min-h-0">
      <div className="shrink-0 px-3 py-3 border-b border-border/50">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          멤버 — {members.length}
        </h2>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-4">
          {grouped.map((group) => (
            <div key={group.status}>
              <p className="px-2 text-[11px] font-semibold text-muted-foreground mb-1">
                {group.label} — {group.items.length}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((m) => (
                  <li key={m.id}>
                    <MemberRow member={m} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
