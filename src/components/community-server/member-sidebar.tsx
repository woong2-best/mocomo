"use client";

import Link from "next/link";
import { Crown, Mic, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityPresenceStatus, CommunityRoleType } from "@prisma/client";
import type { CommunityMemberView } from "@/lib/community-server/types";
import { ROLE_GROUP_LABELS, ROLE_GROUP_ORDER } from "@/lib/community-server/rbac-defaults";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunityMembers } from "@/hooks/use-community-members";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";

const PRESENCE_DOT: Record<CommunityPresenceStatus, string> = {
  ONLINE: "bg-emerald-500",
  IDLE: "bg-amber-400",
  DND: "bg-red-500",
  OFFLINE: "bg-muted-foreground/40",
};

const PRESENCE_EMOJI: Record<CommunityPresenceStatus, string> = {
  ONLINE: "🟢",
  IDLE: "🟡",
  DND: "🔴",
  OFFLINE: "⚫",
};

function MemberRow({ member }: { member: CommunityMemberView }) {
  const displayName = member.nickname ?? member.name ?? member.username;
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
          title={member.presence}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-sm truncate font-medium flex items-center gap-1"
          style={topRole?.color ? { color: topRole.color } : undefined}
        >
          <span className="text-[10px] shrink-0" aria-hidden>
            {PRESENCE_EMOJI[member.presence]}
          </span>
          <span className="truncate">{displayName}</span>
          {member.voiceActivity === "VOICE" && (
            <Mic className="h-3 w-3 text-muted-foreground shrink-0" aria-label="음성 채널" />
          )}
          {member.voiceActivity === "VIDEO" && (
            <Video className="h-3 w-3 text-muted-foreground shrink-0" aria-label="영상 채널" />
          )}
        </p>
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
  const { memberCount, welcomePending, openWelcome } = useCommunityMembership();

  const grouped = ROLE_GROUP_ORDER.map((roleType: CommunityRoleType) => ({
    roleType,
    label: ROLE_GROUP_LABELS[roleType],
    items: members.filter((m) => m.primaryRoleType === roleType),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-muted/20 border-l border-border/60 h-full min-h-0">
      <button
        type="button"
        className="shrink-0 px-3 py-3 border-b border-border/50 text-left w-full hover:bg-muted/40 transition-colors"
        onClick={openWelcome}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          멤버 — {memberCount || members.length}
          {welcomePending && (
            <span
              className="inline-flex h-2 w-2 rounded-full bg-red-500"
              aria-label="새 멤버 환영 알림"
            />
          )}
        </h2>
      </button>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-4">
          {grouped.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">멤버 목록을 불러오는 중…</p>
          ) : (
            grouped.map((group) => (
              <div key={group.roleType}>
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
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
