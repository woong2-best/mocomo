"use client";

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
      setError("질문과 선택지를 입력해 주세요.");
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
      setError(res.error ?? "실패");
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
      setError(res.error ?? "실패");
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
          <BarChart3 className="h-3.5 w-3.5" /> 투표 후원
        </p>
        {isHost && !poll && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreating((v) => !v)}>
            {creating ? "닫기" : "투표 만들기"}
          </Button>
        )}
      </div>

      {creating && isHost && (
        <div className="space-y-2">
          <Input placeholder="질문 (예: 다음 게임은?)" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Input placeholder="선택 1" value={optA} onChange={(e) => setOptA(e.target.value)} />
          <Input placeholder="선택 2" value={optB} onChange={(e) => setOptB(e.target.value)} />
          <Button size="sm" className="w-full" disabled={loading} onClick={() => void handleCreate()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "투표 시작"}
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
