"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LiveSupportPollPayload } from "@/lib/live-support/types";
import { createLivePoll, voteLivePoll } from "@/hooks/use-live-support-socket";
import type { Socket } from "socket.io-client";
import type { LiveTipAlert } from "@/components/live/live-donation-alert-overlay";

export function LiveSupportPollBar({
  channelId,
  isHost,
  socket,
  poll,
  onPoll,
  onAlert,
}: {
  channelId: string;
  isHost: boolean;
  socket: Socket | null;
  poll: LiveSupportPollPayload | null;
  onPoll: (p: LiveSupportPollPayload | null) => void;
  onAlert?: (alert: LiveTipAlert) => void;
}) {
  const { t } = useLocale();
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/live/${channelId}/support/polls`, { credentials: "include" });
        const body = await res.json();
        if (cancelled || !res.ok || !body.ok) return;
        onPoll(body.poll ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId, onPoll]);

  async function handleCreate() {
    setError("");
    if (!question.trim() || !optA.trim() || !optB.trim()) {
      setError(t("live.s1qnjt11"));
      return;
    }
    setLoading(true);
    const res = await createLivePoll(socket, {
      channelId,
      question: question.trim(),
      options: [optA.trim(), optB.trim()],
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? t("live.syb44"));
      return;
    }
    if (res.poll) onPoll(res.poll);
    setCreating(false);
    setQuestion("");
    setOptA("");
    setOptB("");
  }

  async function handleVote(optionId: string) {
    if (!poll) return;
    setLoading(true);
    const res = await voteLivePoll(socket, { pollId: poll.id, optionId });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? t("live.syb44"));
      return;
    }
    if (res.poll) onPoll(res.poll);
    if (res.event && onAlert) {
      onAlert({
        id: res.event.id,
        amount: res.event.amount,
        message: res.event.message,
        username: res.event.username,
        at: res.event.at,
        kind: "cheer",
        eventType: "VOTE",
      });
    }
  }

  const totalVotes = poll?.options.reduce((s, o) => s + o.votes, 0) ?? 0;

  return (
    <div className="rounded-lg border bg-card/95 backdrop-blur p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5" /> {t("live.s1v8osn0")}
        </p>
        {isHost && !poll && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreating((v) => !v)}>
            {creating ? t("common.close") : t("live.sogs84o")}
          </Button>
        )}
      </div>

      {creating && isHost && (
        <div className="space-y-2">
          <Input placeholder={t("live.sbfzpcg")} value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Input placeholder={t("live.sp7i07i")} value={optA} onChange={(e) => setOptA(e.target.value)} />
          <Input placeholder={t("live.sp7i07j")} value={optB} onChange={(e) => setOptB(e.target.value)} />
          <Button size="sm" className="w-full" disabled={loading} onClick={() => void handleCreate()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("live.s1v8lew5")}
          </Button>
        </div>
      )}

      {poll && poll.status === "OPEN" && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{poll.question}</p>
          <p className="text-[10px] text-muted-foreground">투표당 {poll.voteCost.toLocaleString()} CP</p>
          {poll.options.map((o) => {
            const pct = totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0;
            return (
              <button
                key={o.id}
                type="button"
                disabled={loading || isHost}
                onClick={() => void handleVote(o.id)}
                className="w-full text-left relative rounded-md border overflow-hidden disabled:opacity-80 hover:border-primary/50 transition-colors"
              >
                <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${pct}%` }} />
                <div className="relative flex justify-between px-2 py-1.5 text-xs">
                  <span>{o.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {o.votes.toLocaleString()} CP ({pct}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
