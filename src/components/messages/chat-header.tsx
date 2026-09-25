"use client";

import type { SupportTierLevel } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DmCallButtons } from "@/components/call/dm-call-buttons";
import {
  AddChatMemberDialog,
  type ChatMemberPreview,
} from "@/components/messages/add-chat-member-dialog";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { PresenceAvatar } from "@/components/user/presence-avatar";
import { useChatSocket } from "@/components/messages/chat-socket-context";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";
import { PeerLocalClock, PeerMemberClocks } from "@/components/messages/peer-local-clock";

export function ChatHeader({
  displayName,
  displayImage,
  profileUsername,
  supportTierSent,
  roomId,
  roomType,
  otherUserId,
  otherTimeZone,
  viewerUserId,
  members = [],
  memberCount,
  showBackOnMobile = true,
}: {
  displayName: string;
  displayImage: string | null;
  profileUsername?: string;
  supportTierSent?: SupportTierLevel;
  roomId: string;
  roomType: string;
  otherUserId?: string;
  otherTimeZone?: string | null;
  viewerUserId?: string;
  members?: ChatMemberPreview[];
  memberCount?: number;
  showBackOnMobile?: boolean;
}) {
  const { isNativeApp } = useClientPlatform();
  const profileHref = profileUsername ? `/u/${profileUsername}` : undefined;
  const { isUserOnline, socketReady, realtimeOff } = useChatSocket();
  const otherOnline = otherUserId ? isUserOnline(otherUserId) : false;
  const canAddMembers = roomType === "DM" || roomType === "GROUP";
  const clockMembers = members
    .filter((m) => m.id !== viewerUserId)
    .map((m) => ({
      id: m.id,
      name: m.name?.trim() || m.username,
      timeZone: m.timeZone,
    }));
  const presenceLabel =
    roomType === "GROUP"
      ? `${memberCount ?? members.length}명`
      : roomType === "DM" && otherUserId
        ? !socketReady && !realtimeOff
          ? "연결 중…"
          : otherOnline
            ? "접속 중"
            : "오프라인"
        : "프로필 보기";

  return (
    <header className={cn("flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border/60 bg-background/95 backdrop-blur-md shrink-0 z-10", isNativeApp && "pt-safe")}>
      {showBackOnMobile && (
        <Link
          href="/messages"
          className="md:hidden p-2 -ml-1 rounded-full hover:bg-muted/80 shrink-0"
          aria-label="대화 목록"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}

      {profileHref ? (
        <Link href={profileHref} prefetch className="flex items-center gap-3 min-w-0 flex-1">
          <PresenceAvatar online={otherOnline} size="md">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={displayImage ?? undefined} />
              <AvatarFallback className="text-sm font-semibold">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </PresenceAvatar>
          <div className="min-w-0">
            <DisplayNameWithSupportTier
              name={displayName}
              tier={supportTierSent ?? "SEED"}
              nameClassName="font-semibold text-sm"
              compact
            />
            <p
              className={
                otherOnline
                  ? "text-xs text-folk-cobalt font-medium"
                  : "text-xs text-muted-foreground"
              }
            >
              {presenceLabel}
              {roomType === "DM" && otherTimeZone ? (
                <>
                  {" · "}
                  <PeerLocalClock timeZone={otherTimeZone} />
                </>
              ) : null}
              {roomType === "GROUP" ? (
                <>
                  {" · "}
                  <PeerMemberClocks members={clockMembers} />
                </>
              ) : null}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={displayImage ?? undefined} />
            <AvatarFallback className="text-sm">{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <DisplayNameWithSupportTier
              name={displayName}
              tier={supportTierSent ?? "SEED"}
              nameClassName="font-semibold text-sm"
              compact
            />
            <p className="text-xs text-muted-foreground">
              {presenceLabel}
              {roomType === "DM" && otherTimeZone ? (
                <>
                  {" · "}
                  <PeerLocalClock timeZone={otherTimeZone} />
                </>
              ) : null}
              {roomType === "GROUP" ? (
                <>
                  {" · "}
                  <PeerMemberClocks members={clockMembers} />
                </>
              ) : null}
            </p>
          </div>
        </div>
      )}

      {canAddMembers ? <AddChatMemberDialog roomId={roomId} members={members} /> : null}

      {roomType === "DM" && otherUserId && (
        <DmCallButtons
          calleeId={otherUserId}
          chatRoomId={roomId}
          calleePeer={{
            id: otherUserId,
            username: displayName,
            image: displayImage,
          }}
        />
      )}
    </header>
  );
}
