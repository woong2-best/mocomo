"use client";

import { Suspense } from "react";
import type { SupportTierLevel } from "@prisma/client";
import { ChatSocketProvider } from "@/components/messages/chat-socket-context";
import { ChatHeader } from "@/components/messages/chat-header";
import { ChatRoomClient } from "@/components/chat/chat-room";
import { GroupRoomPanel } from "@/components/chat/group-room-panel";
import type { ChatMessageView } from "@/lib/chat-message-normalize";

type GroupMeta = {
  roomType: string;
  isOwner: boolean;
  announcementTitle: string | null;
  announcementBody: string | null;
  voiceLive: boolean;
  voiceChannelId: string | null;
  polls: {
    id: string;
    question: string;
    options: { id: string; label: string; count: number }[];
    myVote: string | null;
  }[];
  joinCode: string | null;
};

export function ChatRoomShell({
  roomId,
  userId,
  username,
  userImage,
  userSupportTier,
  initialMessages,
  header,
  groupMeta,
  readOnly = false,
  guestMode = false,
  vipEmoji = false,
  communityId,
  canDeleteMessages = false,
}: {
  roomId: string;
  userId: string;
  username: string;
  userImage: string | null;
  userSupportTier: SupportTierLevel;
  initialMessages: ChatMessageView[];
  header: {
    displayName: string;
    displayImage: string | null;
    profileUsername?: string;
    supportTierSent?: SupportTierLevel;
    roomType: string;
    otherUserId?: string;
  };
  groupMeta: GroupMeta | null;
  readOnly?: boolean;
  guestMode?: boolean;
  vipEmoji?: boolean;
  communityId?: string;
  canDeleteMessages?: boolean;
}) {
  const inner = (
      <div className="flex flex-col flex-1 min-h-0">
        <ChatHeader
          displayName={header.displayName}
          displayImage={header.displayImage}
          profileUsername={header.profileUsername}
          supportTierSent={header.supportTierSent}
          roomId={roomId}
          roomType={header.roomType}
          otherUserId={header.otherUserId}
        />
        {groupMeta ? (
          <GroupRoomPanel
            roomId={roomId}
            roomType={groupMeta.roomType}
            isOwner={groupMeta.isOwner}
            announcementTitle={groupMeta.announcementTitle}
            announcementBody={groupMeta.announcementBody}
            voiceLive={groupMeta.voiceLive}
            voiceChannelId={groupMeta.voiceChannelId}
            polls={groupMeta.polls}
            joinCode={groupMeta.joinCode}
          />
        ) : null}
        <Suspense fallback={<div className="flex-1 min-h-0 bg-muted/20 animate-pulse" />}>
          <ChatRoomClient
            roomId={roomId}
            userId={userId}
            username={username}
            userImage={userImage}
            userSupportTier={userSupportTier}
            initialMessages={initialMessages}
            readOnly={readOnly}
            communityId={communityId}
            vipEmoji={vipEmoji}
            canDeleteMessages={canDeleteMessages}
          />
        </Suspense>
      </div>
  );

  if (guestMode) return inner;

  return <ChatSocketProvider roomId={roomId}>{inner}</ChatSocketProvider>;
}
