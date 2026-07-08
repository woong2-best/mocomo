"use client";

import { ChatRoomShell } from "@/components/messages/chat-room-shell";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import type { ChatMessageView } from "@/lib/chat-message-normalize";
import type { SupportTierLevel } from "@prisma/client";

export function TextChannelShell({
  serverReadOnly,
  roomId,
  userId,
  username,
  userImage,
  userSupportTier,
  initialMessages,
  header,
}: {
  serverReadOnly: boolean;
  roomId: string;
  userId: string;
  username: string;
  userImage: string | null;
  userSupportTier: SupportTierLevel;
  initialMessages: ChatMessageView[];
  header: {
    displayName: string;
    displayImage: string | null;
    roomType: string;
  };
}) {
  const { isMember, isOwner } = useCommunityMembership();
  const readOnly = serverReadOnly && !isMember && !isOwner;

  return (
    <ChatRoomShell
      roomId={roomId}
      userId={userId}
      username={username}
      userImage={userImage}
      userSupportTier={userSupportTier}
      initialMessages={initialMessages}
      header={header}
      groupMeta={null}
      readOnly={readOnly}
    />
  );
}
