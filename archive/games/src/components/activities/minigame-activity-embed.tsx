"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useMinigameRoom } from "@/hooks/use-minigame-room";
import { getMinigameById } from "@/lib/minigames/registry";
import {
  MinigameFinishedBanner,
  MinigameLobbyPanel,
} from "@/components/minigames/minigame-lobby-panel";
import { MinigameClockBar } from "@/components/minigames/minigame-clock-bar";
import { GameActiveView } from "@/components/minigames/game-views";
import { GameRoomGate } from "@/components/minigames/game-room-gate";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activities/activity-provider";
import { saveGameCreateOptions, saveGameJoinOptions } from "@/lib/games-lobby";

function dmRoomPassword(roomId: string) {
  return `dm${roomId.replace(/[^a-zA-Z0-9]/g, "")}xx`.slice(0, 16);
}

/** DM 안 임베드 — /games 미니게임 로직 그대로 사용, 페이지 이동 없음 */
export function MinigameActivityEmbed({
  gameId,
  roomId,
  mode,
}: {
  gameId: string;
  roomId: string;
  mode: "create" | "join";
}) {
  const game = getMinigameById(gameId);
  const { data: session } = useSession();
  const { leaveActivity, backToChat } = useActivity();
  const userId = session?.user?.id;
  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";
  const seeded = useRef(false);

  if (!seeded.current && typeof window !== "undefined") {
    const password = dmRoomPassword(roomId);
    if (mode === "create") saveGameCreateOptions(gameId, { password });
    saveGameJoinOptions(gameId, { password });
    seeded.current = true;
  }

  const {
    state,
    error,
    joined,
    connecting,
    needsPassword,
    isHost,
    realtimeOff,
    setReady,
    startGame,
    sendMove,
    requestRematch,
    setError,
    retryConnection,
    leaveRoom,
  } = useMinigameRoom(gameId, roomId, userId, username, mode, () => {
    leaveActivity();
    backToChat();
  });

  // 게스트는 호스트 방 생성 직후 입장 재시도
  useEffect(() => {
    if (mode !== "join" || joined) return;
    const t = window.setTimeout(() => retryConnection(), 900);
    return () => window.clearTimeout(t);
  }, [mode, joined, retryConnection]);

  function handleLeave() {
    leaveRoom();
    leaveActivity();
  }

  if (!session?.user) {
    return <p className="text-xs text-muted-foreground text-center py-4">로그인 후 플레이할 수 있습니다.</p>;
  }

  if (!joined) {
    return (
      <GameRoomGate
        roomId={roomId}
        title={mode === "create" ? "방 만드는 중" : "입장 중"}
        connecting={connecting}
        realtimeOff={realtimeOff}
        needsPassword={needsPassword}
        error={error}
        password=""
        onPasswordChange={() => {}}
        onSubmit={() => retryConnection()}
        onRetry={retryConnection}
        submitLabel="다시 연결"
      />
    );
  }

  return (
    <div className="space-y-3 max-h-[min(52vh,420px)] overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground truncate">
          {game?.name ?? gameId} · {roomId}
        </p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleLeave}>
          나가기
        </Button>
      </div>

      {state && (
        <MinigameFinishedBanner
          state={state}
          gameId={gameId}
          isHost={isHost}
          canRematch
          onRematch={() => void requestRematch()}
        />
      )}

      {state?.status === "lobby" && (
        <MinigameLobbyPanel
          state={state}
          joined={joined}
          error={error}
          userId={userId}
          isHost={isHost}
          onReady={(r) => void setReady(r)}
          onStart={() => void startGame()}
          onLeave={handleLeave}
        />
      )}

      {(state?.status === "playing" || state?.status === "finished") && state.game && (
        <div className="space-y-2">
          {state.status === "playing" && <MinigameClockBar state={state} userId={userId} />}
          <GameActiveView
            gameId={gameId}
            state={state}
            userId={userId}
            isSpectator={state.status === "finished"}
            onMove={(m) => sendMove(m)}
            error={error}
            onClearError={() => setError(null)}
          />
        </div>
      )}
    </div>
  );
}
