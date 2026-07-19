"use client";

import { getActivityById } from "@/lib/activities/registry";
import { useActivityOptional } from "@/components/activities/activity-provider";
import { TicTacToeBoard } from "@/components/activities/tic-tac-toe-board";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActivityPanel() {
  const activity = useActivityOptional();
  if (!activity) return null;
  const { session, leaveActivity, playAgain, backToChat, myResult } = activity;

  if (!session || session.phase === "idle" || session.phase === "inviting" || session.phase === "picking") {
    return null;
  }

  if (session.phase !== "active" && session.phase !== "ended") return null;

  const def = getActivityById(session.activityId);
  const ended = session.phase === "ended";

  return (
    <div
      className={cn(
        "shrink-0 border-t border-b border-folk-cobalt/15 bg-gradient-to-b from-folk-cream/70 to-background",
        "px-3 py-3 space-y-3"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-folk-terracotta uppercase tracking-wide">Activity</p>
          <p className="text-sm font-bold truncate">
            {def?.icon} {def?.title ?? session.activityId}
          </p>
        </div>
        {!ended && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={leaveActivity}>
            나가기
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {session.players.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center rounded-full border border-folk-cobalt/15 bg-background px-2 py-0.5 text-[10px] font-semibold"
          >
            {p.username}
          </span>
        ))}
      </div>

      {!ended && session.activityId === "tic-tac-toe" && <TicTacToeBoard />}

      {!ended && session.activityId !== "tic-tac-toe" && (
        <div className="rounded-xl border border-dashed border-folk-cobalt/20 bg-muted/30 px-3 py-6 text-center space-y-1">
          <p className="text-sm font-semibold">Activity 세션이 시작되었습니다</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            채팅·음성은 그대로 유지됩니다. 이 Activity의 인채팅 보드 연동을 이어서 붙일 수 있도록
            레지스트리에 등록되어 있습니다.
          </p>
        </div>
      )}

      {ended && (
        <div className="rounded-xl border-2 border-folk-cobalt/20 bg-background px-4 py-5 text-center space-y-3">
          <p className="text-lg font-bold">
            {myResult === "win"
              ? "You Win"
              : myResult === "lose"
                ? "You Lose"
                : myResult === "draw"
                  ? "Draw"
                  : "Activity Ended"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" className="rounded-xl" onClick={playAgain}>
              Play Again
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={backToChat}>
              Back To Chat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
