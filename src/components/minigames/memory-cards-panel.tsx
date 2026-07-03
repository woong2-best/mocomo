"use client";

import Image from "next/image";
import type { MemoryCard } from "@/lib/minigames/memory-cards";
import { memoryGridCols } from "@/lib/minigames/memory-cards";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type Props = {
  cards: MemoryCard[];
  currentPlayer: string;
  firstSelectedCard: string | null;
  secondSelectedCard: string | null;
  scores: Record<string, number>;
  remainingPairs: number;
  resolving: boolean;
  players: MinigamePlayerPublic[];
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  onMove: (cardId: string) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function MemoryCardsPanel({
  cards,
  currentPlayer,
  firstSelectedCard,
  secondSelectedCard,
  scores,
  remainingPairs,
  resolving,
  players,
  userId,
  isSpectator,
  finished,
  onMove,
}: Props) {
  const myTurn = currentPlayer === userId && !isSpectator && !finished && !resolving;
  const cols = memoryGridCols(cards.length);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-folk-cobalt/20 bg-card/80 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-folk-cobalt">
            {finished
              ? "게임 종료"
              : resolving
                ? "카드 확인 중…"
                : myTurn
                  ? "내 턴"
                  : `${playerName(players, currentPlayer)}의 턴`}
          </span>
          <span className="text-xs text-muted-foreground">남은 쌍 {remainingPairs}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {players.map((p) => {
            const active = !finished && currentPlayer === p.userId;
            return (
              <div
                key={p.userId}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs",
                  active ? "border-folk-terracotta bg-folk-terracotta/10 font-semibold" : "border-border",
                  p.userId === userId && "ring-1 ring-folk-cobalt/30"
                )}
              >
                {p.username}{" "}
                <span className="font-mono tabular-nums">{scores[p.userId] ?? 0}점</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          같은 그림 2장을 맞추면 점수 +1 · 맞추면 연속 턴 · 틀리면 1초 후 상대 턴
        </p>
      </div>

      <div
        className="grid gap-2 sm:gap-3 mx-auto max-w-lg"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => {
          const faceUp = card.isFlipped || card.isMatched;
          const selected =
            card.id === firstSelectedCard || card.id === secondSelectedCard;
          const clickable = myTurn && !card.isMatched && !faceUp;

          return (
            <button
              key={card.id}
              type="button"
              disabled={!clickable}
              onClick={() => void onMove(card.id)}
              className={cn(
                "relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-cobalt/40",
                card.isMatched
                  ? "border-folk-gold/40 bg-folk-gold/10 opacity-70"
                  : faceUp
                    ? "border-folk-gold/60 bg-white shadow-sm"
                    : "border-folk-cobalt/25 bg-folk-cobalt/8 hover:bg-folk-cobalt/12",
                selected && "ring-2 ring-folk-terracotta scale-[1.02]",
                !clickable && !card.isMatched && "cursor-default"
              )}
              aria-label={faceUp ? `카드 ${card.pairId + 1}` : "뒷면 카드"}
            >
              {faceUp ? (
                <Image
                  src={card.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 22vw, 100px"
                  className="object-contain p-1.5 pointer-events-none"
                  unoptimized
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-folk-cobalt/35 select-none">
                  ?
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
