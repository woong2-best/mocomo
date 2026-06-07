"use client";

import { useCallback, useEffect, useState } from "react";

export type LiveCollabCoHost = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type LiveCollabState = {
  splitEnabled: boolean;
  splitActive: boolean;
  coHostUserId: string | null;
  coHost: LiveCollabCoHost | null;
  hostUserId: string;
};

const EMPTY: LiveCollabState = {
  splitEnabled: false,
  splitActive: false,
  coHostUserId: null,
  coHost: null,
  hostUserId: "",
};

export function useLiveCollabState(channelId: string, enabled = true) {
  const [state, setState] = useState<LiveCollabState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!enabled || !channelId) return;
    try {
      const res = await fetch(`/api/live/${channelId}/collab`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = (await res.json()) as LiveCollabState;
      setState(body);
    } catch {
      /* ignore */
    }
  }, [channelId, enabled]);

  useEffect(() => {
    void refresh();
    if (!enabled) return;
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [refresh, enabled]);

  return { ...state, refresh };
}
