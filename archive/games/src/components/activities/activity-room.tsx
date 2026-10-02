"use client";

import type { ReactNode } from "react";
import { ActivityProvider } from "@/components/activities/activity-provider";
import { ActivityPickerSheet } from "@/components/activities/activity-picker-sheet";
import { ActivityInviteBanner } from "@/components/activities/activity-invite-banner";
import type { ActivityContextType, ActivityPlayer } from "@/lib/activities/types";

/** DM/Community 공통 Activity 룸 셸 — 채팅을 벗어나지 않음 (게임 패널은 입력창 위에 삽입) */
export function ActivityRoom({
  contextType,
  contextId,
  roomId,
  peerUserId,
  peerHint,
  children,
}: {
  contextType: ActivityContextType;
  contextId: string;
  /** 채팅 메시지로 게임 카드를 올릴 방 id (커뮤니티 텍스트/DM) */
  roomId?: string;
  peerUserId?: string;
  peerHint?: ActivityPlayer;
  children: ReactNode;
}) {
  return (
    <ActivityProvider
      contextType={contextType}
      contextId={contextId}
      roomId={roomId}
      peerUserId={peerUserId}
      peerHint={peerHint}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <ActivityInviteBanner />
        {children}
        <ActivityPickerSheet />
      </div>
    </ActivityProvider>
  );
}
