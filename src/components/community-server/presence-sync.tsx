"use client";

import { useEffect, useRef } from "react";
import { updateCommunityPresence } from "@/actions/community-server";

/** 진입 시 1회만 ONLINE 표시 — 채널 전환마다 재호출하지 않음 */
export function CommunityPresenceSync({ communityId }: { communityId: string }) {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    const t = window.setTimeout(() => {
      void updateCommunityPresence(communityId, "ONLINE");
    }, 800);
    return () => window.clearTimeout(t);
  }, [communityId]);

  return null;
}
