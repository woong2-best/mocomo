"use client";

import { useEffect, useRef } from "react";

/**
 * 커뮤니티 Presence — 최초 1회만, 다른 API와 안 겹치게 늦게 실행.
 * 실패해도 무시 (504 시에도 음성 입장을 막지 않음).
 */
export function CommunityPresenceSync({ communityId }: { communityId: string }) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !communityId) return;
    done.current = true;

    const t = window.setTimeout(() => {
      void fetch(`/api/community/${communityId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presence: "ONLINE" }),
      }).catch(() => undefined);
    }, 5_000);

    return () => window.clearTimeout(t);
  }, [communityId]);

  return null;
}
