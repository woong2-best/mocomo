"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, Check } from "lucide-react";
import { formatPollTimeLeft, type PostPollView } from "@/lib/post-poll";
import { cn } from "@/lib/utils";

type PostPollCardProps = {
  postId: string;
  poll: PostPollView;
  compact?: boolean;
  onVote?: (poll: PostPollView) => void;
};

export function PostPollCard({ postId, poll: initialPoll, compact, onVote }: PostPollCardProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();

  const revealBars = poll.closed || poll.myVoteOptionId != null;

  async function handleVote(optionId: string) {
    if (poll.closed || busy) return;
    if (status === "loading") return;
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${postId}`)}`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/poll/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ optionId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        poll?: PostPollView;
        error?: string;
      };
      if (!res.ok || !data.poll) {
        setError(data.error ?? "투표에 실패했습니다.");
        return;
      }
      setPoll(data.poll);
      onVote?.(data.poll);
    } catch {
      setError("투표에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-muted/20 overflow-hidden",
        compact ? "mx-3 mb-3" : ""
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 font-medium">
          <BarChart3 className="h-3.5 w-3.5" />
          {poll.totalVotes.toLocaleString()}표
        </span>
        <span>{formatPollTimeLeft(poll.closesAt, poll.closed)}</span>
      </div>

      <div className="p-2 space-y-1.5">
        {poll.options.map((opt) => {
          const pct =
            poll.totalVotes > 0 ? Math.round((opt.count / poll.totalVotes) * 100) : 0;
          const selected = poll.myVoteOptionId === opt.id;
          const maxCount = Math.max(...poll.options.map((o) => o.count), 0);
          const isWinner = poll.closed && poll.totalVotes > 0 && opt.count === maxCount && maxCount > 0;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={poll.closed || busy}
              onClick={() => void handleVote(opt.id)}
              className={cn(
                "relative w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors overflow-hidden min-h-[40px]",
                poll.closed ? "cursor-default" : "hover:border-primary/50",
                selected
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border/70 bg-background/80",
                isWinner && poll.closed && "border-primary/60"
              )}
            >
              {revealBars && (
                <span
                  className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0">
                  {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  <span className="truncate">{opt.label}</span>
                </span>
                {revealBars && (
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {!poll.closed && !poll.myVoteOptionId && (
        <p className="px-3 pb-2 text-[10px] text-muted-foreground">탭하여 투표 · 마감 전 변경 가능</p>
      )}
      {poll.closed && (
        <p className="px-3 pb-2 text-[10px] text-muted-foreground">투표가 종료되었습니다</p>
      )}
      {error && <p className="px-3 pb-2 text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
