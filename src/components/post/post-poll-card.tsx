"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  formatPollMeta,
  isPostPollClosed,
  pollOptionPercents,
  type PostPollView,
} from "@/lib/post-poll";
import { cn } from "@/lib/utils";

type PostPollCardProps = {
  postId: string;
  poll: PostPollView;
  /** 글 작성자 — 투표 없이 득표율을 본다 */
  isAuthor?: boolean;
  compact?: boolean;
  onVote?: (poll: PostPollView) => void;
};

export function PostPollCard({ postId, poll: initialPoll, isAuthor = false, compact, onVote }: PostPollCardProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const router = useRouter();

  const [now, setNow] = useState(() => Date.now());
  const incomingKey = `${initialPoll.id}:${initialPoll.myVoteOptionId ?? ""}:${initialPoll.totalVotes}:${initialPoll.closed}:${initialPoll.closesAt}`;
  useEffect(() => {
    setPoll(initialPoll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingKey]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const ended = poll.closed || new Date(poll.closesAt).getTime() <= now || isPostPollClosed(poll);
  const showResults = isAuthor || ended || poll.myVoteOptionId != null;

  const pctByOption = useMemo(
    () => pollOptionPercents(poll.options, poll.totalVotes),
    [poll.options, poll.totalVotes]
  );

  async function handleVote(optionId: string) {
    if (showResults || ended || busy || isAuthor) return;
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
        if (data.error?.includes("종료")) {
          setPoll((current) => ({ ...current, closed: true }));
        }
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
    <div className={cn(compact ? "" : "mt-3")} onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const { labelPct, barPct } = pctByOption.get(opt.id) ?? { labelPct: 0, barPct: 0 };
          const selected = poll.myVoteOptionId === opt.id;
          const fillScale = Math.min(1, Math.max(0, barPct / 100));

          if (!showResults) {
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => void handleVote(opt.id)}
                className="w-full rounded-lg border-2 border-folk-cobalt bg-folk-cream/40 px-4 py-2.5 text-center text-[15px] font-semibold text-folk-cobalt transition-colors hover:bg-folk-cobalt/10 disabled:opacity-60 dark:border-[#6BA3E8] dark:bg-transparent dark:text-[#6BA3E8] dark:hover:bg-[#6BA3E8]/10"
              >
                {opt.label}
              </button>
            );
          }

          return (
            <div
              key={opt.id}
              className="relative w-full overflow-hidden rounded-lg bg-muted/50 text-[15px]"
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 w-full origin-left transition-transform duration-500",
                  selected
                    ? "bg-folk-cobalt/40 dark:bg-[#6BA3E8]/50"
                    : "bg-folk-cobalt/22 dark:bg-[#6BA3E8]/30"
                )}
                style={{ transform: `scaleX(${fillScale})` }}
                aria-hidden
              />
              <div
                className={cn(
                  "relative flex items-center justify-between gap-3 px-4 py-2.5",
                  selected ? "font-semibold text-foreground" : "text-foreground/85"
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {selected ? <Check className="h-4 w-4 shrink-0 text-folk-cobalt dark:text-[#6BA3E8]" /> : null}
                  <span className="truncate">{opt.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-sm text-muted-foreground">{labelPct}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        {formatPollMeta(poll.totalVotes, poll.closesAt, ended)}
      </p>
      {error ? <p className="mt-1 px-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
