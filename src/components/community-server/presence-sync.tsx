"use client";

import { useEffect } from "react";
import { updateCommunityPresence } from "@/actions/community-server";

export function CommunityPresenceSync({ communityId }: { communityId: string }) {
  useEffect(() => {
    void updateCommunityPresence(communityId, "ONLINE");
    const onVis = () => {
      void updateCommunityPresence(communityId, document.hidden ? "IDLE" : "ONLINE");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void updateCommunityPresence(communityId, "OFFLINE");
    };
  }, [communityId]);

  return null;
}
