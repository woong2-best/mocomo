"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Accept/decline buttons for post_collab_invite notifications */
export function CollabInviteNotificationActions({
  link,
}: {
  link: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  const postId = link?.match(/\/post\/([^/?#]+)/)?.[1];
  if (!postId || done) return null;

  async function act(kind: "accept" | "reject") {
    setBusy(kind);
    try {
      const res = await fetch(
        `/api/collaborators/${kind === "accept" ? "accept" : "reject"}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        }
      );
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2 mt-2" onClick={(e) => e.preventDefault()}>
      <Button
        type="button"
        size="sm"
        className="h-7 text-xs"
        disabled={busy !== null}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void act("accept");
        }}
      >
        {busy === "accept" ? "…" : "수락"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={busy !== null}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void act("reject");
        }}
      >
        {busy === "reject" ? "…" : "거절"}
      </Button>
    </div>
  );
}
