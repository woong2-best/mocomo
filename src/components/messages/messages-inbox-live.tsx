"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh the open mailbox as soon as a DM or used-market message arrives. */
export function MessagesInboxLive() {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let since = new Date(Date.now() - 4000).toISOString();
    const ac = new AbortController();

    async function loop() {
      while (!stopped) {
        try {
          const res = await fetch(
            `/api/messages/inbox-wait?since=${encodeURIComponent(since)}`,
            { signal: ac.signal, credentials: "include" }
          );
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          const data = (await res.json()) as { changed?: boolean; serverTime?: string };
          if (data.serverTime) since = data.serverTime;
          if (data.changed) router.refresh();
        } catch {
          if (stopped) return;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    void loop();
    return () => {
      stopped = true;
      ac.abort();
    };
  }, [router]);

  return null;
}
