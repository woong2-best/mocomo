"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  postId: string;
  status: "PENDING" | "ACCEPTED" | null;
  isAuthor?: boolean;
};

export function PostCollabActions({ postId, status, isAuthor }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "reject" | "leave" | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function call(path: string, kind: "accept" | "reject" | "leave") {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("collab.actionFailed"));
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError(t("collab.actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (done || !status) return null;
  if (isAuthor) return null;

  if (status === "PENDING") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
        <p className="text-sm font-medium">{t("collab.inviteBanner")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy !== null}
            onClick={() => void call("/api/collaborators/accept", "accept")}
          >
            {busy === "accept" ? "…" : t("collab.accept")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => void call("/api/collaborators/reject", "reject")}
          >
            {busy === "reject" ? "…" : t("collab.reject")}
          </Button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={busy !== null}
          onClick={() => {
            if (!window.confirm(t("collab.leaveConfirm"))) return;
            void call("/api/collaborators/leave", "leave");
          }}
        >
          {busy === "leave" ? "…" : t("collab.leave")}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return null;
}
