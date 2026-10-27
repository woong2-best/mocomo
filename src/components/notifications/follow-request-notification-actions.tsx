"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { approveFollowRequest, rejectFollowRequest } from "@/actions/social";
import { useLocale } from "@/components/providers/locale-provider";

/** Twitter-style accept / decline on a follow_request notification. */
export function FollowRequestNotificationActions({
  requesterId,
  onDone,
}: {
  requesterId?: string | null;
  onDone?: () => void;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approve" | "reject" | null>(null);

  const id = requesterId?.trim() ?? "";
  if (!id || done) return null;

  async function act(kind: "approve" | "reject") {
    setBusy(kind);
    try {
      const result =
        kind === "approve" ? await approveFollowRequest(id) : await rejectFollowRequest(id);
      if (result && "error" in result && result.error) {
        setDone(kind);
        onDone?.();
        return;
      }
      setDone(kind);
      onDone?.();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2 mt-2" onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        disabled={busy !== null}
        aria-label={t("collab.accept")}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-folk-cobalt text-white disabled:opacity-50"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void act("approve");
        }}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        disabled={busy !== null}
        aria-label={t("collab.reject")}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground disabled:opacity-50"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void act("reject");
        }}
      >
        <X className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
