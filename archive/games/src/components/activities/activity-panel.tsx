"use client";

import { getActivityById } from "@/lib/activities/registry";
import { useActivityOptional } from "@/components/activities/activity-provider";
import { TicTacToeBoard } from "@/components/activities/tic-tac-toe-board";
import { MinigameActivityEmbed } from "@/components/activities/minigame-activity-embed";
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
  const minigameId = def?.minigameId;
  const roomId = session.minigameRoomId;
  const role = session.minigameRole ?? "join";

  return (
    <div
      className={cn(
        "shrink-0 border-t border-b border-folk-cobalt/15 bg-gradient-to-b from-folk-cream/70 to-background",
        "px-3 py-3 space-y-3"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-folk-terracotta uppercase tracking-wide">Play Together</p>
          <p className="text-sm font-bold truncate">
            {def?.icon} {def?.title ?? session.activityId}
          </p>
        </div>
        {!ended && !minigameId && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={leaveActivity}>
            나가기
          </Button>
        )}
      </div>

      {!ended && minigameId && roomId && (
        <MinigameActivityEmbed gameId={minigameId} roomId={roomId} mode={role} />
      )}

      {!ended && session.activityId === "tic-tac-toe" && <TicTacToeBoard />}

      {!ended && minigameId && !roomId && (
        <p className="text-xs text-muted-foreground text-center py-4">게임 방을 준비하는 중…</p>
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
