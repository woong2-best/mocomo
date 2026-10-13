"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, X } from "lucide-react";
import {
  ackSanctionNotice,
  loadMySanctionNotice,
  submitModerationAppeal,
} from "@/actions/operator-sanctions";
import type { PendingSanctionNotice } from "@/lib/operator-sanctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function noticeCopy(notice: PendingSanctionNotice) {
  if (notice.kind === "CONTENT_REMOVE") {
    return {
      title: "A post was removed",
      body: "Operators removed one of your posts after judging that it violated MoCoMo's terms of service. The post is hidden from other users. You can appeal below.",
    };
  }
  if (notice.kind === "SUSPEND_PERMANENT") {
    return {
      title: "Your account is permanently restricted",
      body: "Your account is in read-only mode. You can browse, but posting, likes, comments, and other writes are blocked. You can appeal below.",
    };
  }
  const until = notice.endsAt ? new Date(notice.endsAt).toLocaleString() : "the listed end time";
  return {
    title: "Your account is in read-only mode",
    body: `Your account is temporarily restricted until ${until}. You can browse, but writes are blocked. You can appeal below.`,
  };
}

export function SanctionNoticeDialog() {
  const session = useSession();
  const [notice, setNotice] = useState<PendingSanctionNotice | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (session.status !== "authenticated") return;
    let cancelled = false;
    void loadMySanctionNotice().then((res) => {
      if (cancelled || !res.notice) return;
      setNotice(res.notice);
      setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  if (!open || !notice) return null;
  const copy = noticeCopy(notice);

  function closeAfterAck() {
    startTransition(async () => {
      await ackSanctionNotice(notice?.id);
      setOpen(false);
    });
  }

  function submitAppeal() {
    if (!notice) return;
    setError("");
    startTransition(async () => {
      const res = await submitModerationAppeal({
        title,
        content,
        contactEmail: email,
        sanctionId: notice.id,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
      await ackSanctionNotice(notice.id);
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 overflow-hidden rounded-2xl border border-border bg-[hsl(var(--card))] p-5 text-card-foreground shadow-xl">
        <div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-folk-terracotta" aria-hidden />
            <p className="min-w-0 flex-1 text-lg font-semibold">{copy.title}</p>
            <button
              type="button"
              aria-label="Close"
              disabled={pending}
              onClick={closeAfterAck}
              className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
          {notice.reason ? (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{notice.reason}</p>
          ) : null}
        </div>
        {done ? (
          <div className="space-y-3">
            <p className="text-sm">Your appeal was received. We will review it.</p>
            <Button type="button" className="w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Appeal title"
              maxLength={100}
              className="bg-background"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Explain why this decision should be reviewed (20+ characters)"
              rows={4}
              className="bg-background"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contact email"
              className="bg-background"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={closeAfterAck}>
                Dismiss
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={pending || title.trim().length < 1 || content.trim().length < 20 || !email.trim()}
                onClick={submitAppeal}
              >
                Submit appeal
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
