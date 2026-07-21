"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/** 로그인 사용자의 타 프로필 방문 기록 */
export function ProfileVisitTracker({
  username,
  profileUserId,
}: {
  username: string;
  profileUserId?: string;
}) {
  const session = useSession();
  const viewerId = session?.data?.user?.id;
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (!viewerId) return;
    if (profileUserId && viewerId === profileUserId) return;
    sent.current = true;
    fetch("/api/signals/profile-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(
        profileUserId ? { profileUserId } : { username }
      ),
    }).catch(() => {});
  }, [viewerId, username, profileUserId]);

  return null;
}
