"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMinigameRoom } from "@/hooks/use-minigame-room";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import {
  MinigameFinishedBanner,
  MinigameLobbyPanel,
} from "@/components/minigames/minigame-lobby-panel";
import { MinigameChatPanel } from "@/components/minigames/minigame-chat-panel";
import { MinigameClockBar } from "@/components/minigames/minigame-clock-bar";
import { GameActiveView } from "@/components/minigames/game-views";
import { GameRoomGate } from "@/components/minigames/game-room-gate";
import { Button } from "@/components/ui/button";
import { Eye, LogOut } from "lucide-react";
import type { ParkingRushMode } from "@/lib/minigames/parking-rush-logic";
import { isParkingInstantPlayMode } from "@/lib/minigames/parking-rush-logic";
import type { TowerRushMode } from "@/lib/minigames/tower-rush-logic";
import { isTowerInstantPlayMode } from "@/lib/minigames/tower-rush-logic";

export function PlayRoomClient({
  gameId,
  roomId,
  mode,
}: {
  gameId: string;
  roomId: string;
  mode: "create" | "join" | "spectate";
}) {
  const game = getMinigameById(gameId);
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";
  const [joinPassword, setJoinPassword] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [closeError, setCloseError] = useState("");
  const route = getMinigameRoute(gameId);
  const goToHub = () => router.push(route);

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
    sendChat,
    requestRematch,
    chatMessages,
    setError,
    retryJoinWithPassword,
    retryConnection,
    leaveRoom,
    closeRoom,
  } = useMinigameRoom(gameId, roomId, userId, username, mode, goToHub);

  const isSpectator = mode === "spectate";

  const parkingMode =
    (state?.game?.mode as ParkingRushMode | undefined) ?? state?.parkingRushMode;
  const towerMode = (state?.game?.mode as TowerRushMode | undefined);
  const isParkingInstant =
    gameId === "parking-rush" && !!parkingMode && isParkingInstantPlayMode(parkingMode);
  const isTowerInstant =
    gameId === "tower-rush" && !!towerMode && isTowerInstantPlayMode(towerMode);
  const isInstantPlay = isParkingInstant || isTowerInstant;
  const showSpectator = !isInstantPlay;

  function handleLeave() {
    leaveRoom();
    goToHub();
  }

  async function handleCloseRoom() {
    setCloseError("");
    const ok = await closeRoom();
    if (ok) goToHub();
    else {
      setConfirmClose(false);
      setCloseError("방을 닫지 못했습니다.");
    }
  }

  if (!session?.user) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-sm text-muted-foreground">로그인 후 게임방에 입장할 수 있습니다.</p>
        <Link href={`/auth/signin?callbackUrl=${route}/${roomId}`}>
          <Button className="rounded-xl">로그인</Button>
        </Link>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="space-y-4">
        <Link href={route} className="text-xs text-muted-foreground hover:underline">
          ← {game?.name ?? "게임"} 로비
        </Link>
        <GameRoomGate
          roomId={roomId}
          title={mode === "create" ? "방 만드는 중" : "방 입장"}
          connecting={connecting}
          realtimeOff={realtimeOff}
          needsPassword={needsPassword}
          error={error}
          password={joinPassword}
          onPasswordChange={setJoinPassword}
          onSubmit={() => retryJoinWithPassword(joinPassword)}
          onRetry={retryConnection}
          submitLabel="입장"
        />
        {mode === "create" && error && !needsPassword && (
          <p className="text-center text-sm text-muted-foreground">
            <Link href={route} className="text-primary underline">
              로비에서 방 만들기
            </Link>
            를 다시 시도해 주세요.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={route} className="text-xs text-muted-foreground hover:underline">
          ← {game?.name ?? "게임"} 로비
        </Link>
        <div className="flex items-center gap-2">
          {!isSpectator && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 rounded-lg text-xs"
              onClick={handleLeave}
            >
              <LogOut className="h-3 w-3" />
              나가기
            </Button>
          )}
          {!isSpectator && showSpectator && (
            <Link href={`${route}/${roomId}?spectate=1`}>
              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-xs">
                <Eye className="h-3 w-3" />
                관전
              </Button>
            </Link>
          )}
          {isSpectator && (
            <span className="text-xs font-semibold text-folk-cobalt bg-folk-gold/20 px-2 py-1 rounded">
              관전 중
            </span>
          )}
        </div>
      </div>

      {state && (
        <MinigameFinishedBanner
          state={state}
          gameId={gameId}
          isHost={isHost && !isSpectator}
          canRematch={!isSpectator}
          onRematch={() => void requestRematch()}
        />
      )}

      {state?.status === "lobby" && !isSpectator && (
        <>
          {confirmClose && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm">방을 닫으면 모든 플레이어가 퇴장합니다. 계속할까요?</p>
              {closeError && <p className="text-xs text-destructive">{closeError}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleCloseRoom()}
                >
                  방 닫기
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirmClose(false)}>
                  취소
                </Button>
              </div>
            </div>
          )}
          <MinigameLobbyPanel
            state={state}
            joined={joined}
            error={error}
            userId={userId}
            isHost={isHost}
            onReady={(r) => void setReady(r)}
            onStart={() => void startGame()}
            onLeave={handleLeave}
            onCloseRoom={isHost ? () => setConfirmClose(true) : undefined}
          />
        </>
      )}

      {(state?.status === "playing" || state?.status === "finished") && (
        <div className={isInstantPlay ? "space-y-3" : "grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4"}>
          <div className="min-w-0 space-y-3">
            {state.status === "playing" && <MinigameClockBar state={state} userId={userId} />}
            {state.game ? (
              <GameActiveView
                gameId={gameId}
                state={state}
                userId={userId}
                isSpectator={isSpectator || state.status === "finished"}
                onMove={(m) => sendMove(m)}
                error={error}
                onClearError={() => setError(null)}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">게임 데이터를 불러오는 중…</p>
            )}
          </div>
          {!isInstantPlay && (
            <MinigameChatPanel
              gameId={gameId}
              messages={chatMessages}
              onSend={(t) => sendChat(t)}
              disabled={isSpectator && !state.spectatorChatEnabled}
            />
          )}
        </div>
      )}

      {state?.status === "lobby" && isSpectator && (
        <MinigameLobbyPanel
          state={state}
          joined={joined}
          error={error}
          userId={userId}
          isHost={false}
          onReady={() => {}}
          onStart={() => {}}
        />
      )}
    </div>
  );
}
