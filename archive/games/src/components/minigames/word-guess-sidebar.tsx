"use client";

import { Trophy } from "lucide-react";
import { MinigameChatPanel } from "@/components/minigames/minigame-chat-panel";
import { rankedScores } from "@/lib/minigames/word-guess-logic";
import type { MinigameChatMessage, MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

const MEDAL = ["🥇", "🥈", "🥉"] as const;

type Props = {
  scores: Record<string, number>;
  players: MinigamePlayerPublic[];
  userId?: string;
  messages: MinigameChatMessage[];
  onSendChat: (text: string) => void;
  chatDisabled?: boolean;
};

export function WordGuessSidebar({
  scores,
  players,
  userId,
  messages,
  onSendChat,
  chatDisabled,
}: Props) {
  const ranking = rankedScores(scores, players);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-folk-cobalt/15 bg-card/80 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-folk-cobalt/10 bg-folk-gold/10 px-3 py-2">
          <Trophy className="h-4 w-4 text-folk-gold" />
          <p className="text-xs font-bold text-folk-cobalt">실시간 랭킹</p>
        </div>
        <ul className="p-2 space-y-1 max-h-48 overflow-y-auto">
          {ranking.map((row) => (
            <li
              key={row.userId}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                row.userId === userId ? "bg-folk-cobalt/8 ring-1 ring-folk-cobalt/15" : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 text-center shrink-0 text-xs">
                  {row.rank <= 3 ? MEDAL[row.rank - 1] : `${row.rank}`}
                </span>
                <span className="font-medium truncate">{row.username}</span>
              </div>
              <span className="font-mono font-bold tabular-nums text-folk-terracotta shrink-0">
                {row.score}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <MinigameChatPanel
        gameId="word-guess"
        messages={messages}
        onSend={onSendChat}
        disabled={chatDisabled}
      />
    </div>
  );
}
