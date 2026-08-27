"use client";

import { ActivityRoom } from "@/components/activities/activity-room";
import { ChatRoomShell } from "@/components/messages/chat-room-shell";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import type { ChatMessageView } from "@/lib/chat-message-normalize";
import type { SupportTierLevel } from "@prisma/client";

import { hasPermission } from "@/lib/community-server/permissions";
import { deleteCommunityChatMessage } from "@/actions/community-content";

export function TextChannelShell({
  serverReadOnly,
  guestMode = false,
  communityId,
  roomId,
  userId,
  username,
  userImage,
  userSupportTier,
  initialMessages,
  header,
}: {
  serverReadOnly: boolean;
  guestMode?: boolean;
  communityId: string;
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
  const { isMember, isOwner, permissions } = useCommunityMembership();
  const readOnly = serverReadOnly && !isMember && !isOwner;
  const canDeleteMessages =
    hasPermission(permissions, "deleteMessages") || hasPermission(permissions, "moderateChat");

  return (
    <ActivityRoom contextType="community" contextId={communityId}>
      <ChatRoomShell
        roomId={roomId}
        communityId={communityId}
        userId={userId}
        username={username}
        userImage={userImage}
        userSupportTier={userSupportTier}
        initialMessages={initialMessages}
        header={header}
        groupMeta={null}
        readOnly={readOnly}
        guestMode={guestMode}
        canDeleteMessages={canDeleteMessages}
      />
    </ActivityRoom>
  );
}
