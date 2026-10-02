"use client";

import { ArrowRight, ListOrdered, PencilLine, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SketchQuizPublicState } from "@/lib/sketch-quiz-types";
import { cn } from "@/lib/utils";

type Props = {
  state: SketchQuizPublicState;
  userId?: string;
  variant?: "lobby" | "game";
};

function playerLabel(state: SketchQuizPublicState, userId: string | null | undefined) {
  if (!userId) return null;
  return (
    state.players.find((p) => p.userId === userId)?.username ??
    state.turnOrder.find((t) => t.userId === userId)?.username
  );
}

export function SketchQuizTurnPanel({ state, userId, variant = "game" }: Props) {
  const { turnOrder, drawerId, nextDrawerId, firstDrawerId, roundSeconds } = state;
  const currentName = playerLabel(state, drawerId);
  const nextName = playerLabel(state, nextDrawerId);
  const firstName = playerLabel(state, firstDrawerId);
  const inLobby = variant === "lobby";
  const orderLocked = state.status !== "lobby";

  if (turnOrder.length === 0) return null;

  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardHeader className="pb-2 py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-folk-cobalt" />
          그리기 순서
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!inLobby && currentName && (
          <div className="rounded-xl bg-folk-terracotta/15 border border-folk-terracotta/30 px-3 py-2 text-sm space-y-1">
            <p className="flex items-center gap-1.5 font-semibold text-folk-terracotta">
              <PencilLine className="h-3.5 w-3.5" />
              지금 그리는 사람: {currentName}
              {drawerId === userId && " (나)"}
            </p>
            {nextName && nextName !== currentName && (
              <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <ArrowRight className="h-3 w-3" />
                다음 턴: <strong className="text-foreground">{nextName}</strong>
                {nextDrawerId === userId && " (나)"}
              </p>
            )}
          </div>
        )}

        {inLobby && (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-2.5 py-2">
            게임 시작 시 그리기 순서가 <strong>무작위</strong>로 정해집니다 · 각 턴{" "}
            <strong>{roundSeconds}초</strong> 제한
          </p>
        )}

        {orderLocked && firstName && state.round === 1 && state.status === "playing" && (
          <p className="text-xs text-muted-foreground">
            첫 그리기: <strong>{firstName}</strong>
            {firstDrawerId === userId && " (나)"}
          </p>
        )}

        <ol className="space-y-1">
          {turnOrder.map((entry, index) => {
            const isCurrent = entry.userId === drawerId && !inLobby;
            const isNext = entry.userId === nextDrawerId && !inLobby && state.status === "playing";

            return (
              <li
                key={entry.userId}
                className={cn(
                  "flex items-center gap-2 text-sm rounded-lg px-2 py-1.5",
                  isCurrent && "bg-folk-terracotta/20 font-semibold ring-1 ring-folk-terracotta/40",
                  isNext && !isCurrent && "bg-folk-cobalt/10 ring-1 ring-folk-cobalt/20",
                  !isCurrent && !isNext && "bg-background/60"
                )}
              >
                <span className="w-5 text-xs font-mono text-muted-foreground shrink-0">
                  {orderLocked ? entry.order : index + 1}
                </span>
                <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">
                  {entry.username}
                  {entry.userId === userId && (
                    <span className="text-xs text-muted-foreground ml-1">(나)</span>
                  )}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-bold text-folk-terracotta shrink-0">그리는 중</span>
                )}
                {isNext && !isCurrent && (
                  <span className="text-[10px] font-semibold text-folk-cobalt shrink-0">다음</span>
                )}
                {inLobby && !orderLocked && (
                  <span className="text-[10px] text-muted-foreground shrink-0">대기</span>
                )}
              </li>
            );
          })}
        </ol>

        {inLobby && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {turnOrder.length}명이 모이면 시작할 수 있어요. 순서는 시작 시 셔플되며, 턴당{" "}
            <strong>{roundSeconds}초</strong> 안에 그리고 나머지는 정답을 맞혀요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
