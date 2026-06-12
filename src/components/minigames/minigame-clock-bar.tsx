"use client";

import type { MinigamePublicState } from "@/lib/minigames/shared-types";
import { formatClockMs } from "@/lib/minigames/time-control";

export function MinigameClockBar({
  state,
  userId,
}: {
  state: MinigamePublicState;
  userId?: string;
}) {
  if (!state.timeControl || state.timeControl === "unlimited" || !state.clocks) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {state.players.map((p) => {
        const sec = state.clocks?.[p.userId] ?? 0;
        const active = state.game && (state.game as { turnUserId?: string }).turnUserId === p.userId;
        return (
          <div
            key={p.userId}
            className={`rounded-lg border px-3 py-1.5 text-xs font-mono ${
              active ? "border-folk-terracotta bg-folk-terracotta/10" : "border-border"
            } ${p.userId === userId ? "ring-1 ring-folk-cobalt/30" : ""}`}
          >
            <span className="font-semibold">{p.username}</span>{" "}
            {formatClockMs(sec * 1000)}
          </div>
        );
      })}
    </div>
  );
}
