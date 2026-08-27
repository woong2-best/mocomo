"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import { cn } from "@/lib/utils";
import { SOCKET_ACK_MS } from "@/lib/socket-timing";

type Phase = "lobby" | "discussion" | "voting" | "result";

type Player = { id: string; nickname: string; isHost: boolean };

type RoomState = {
  code: string;
  phase: Phase;
  hostId: string;
  players: Player[];
  minPlayers: number;
  canStart: boolean;
  voteProgress: { voted: number; total: number } | null;
  lastResult: GameResult | null;
};

type RolePayload = {
  role: "liar" | "civilian";
  categoryLabel: string;
  word?: string;
  hint?: string;
};

type GameResult = {
  winner: "civilians" | "liar";
  liarNickname: string;
  word: string;
  categoryLabel: string;
  mostVoted: { id: string; nickname: string }[];
  maxVotes: number;
  liarCaught: boolean;
  tally: { id: string; nickname: string; votes: number }[];
  message: string;
};

type ChatLine = { playerId: string; nickname: string; message: string; at: number };

type Ack = { ok: boolean; error?: string; code?: string; playerId?: string; hostId?: string };

const PHASE_LABELS: Record<Phase, string> = {
  lobby: "로비",
  discussion: "토론",
  voting: "투표",
  result: "결과",
};

export function LiarGameClient() {
  const { data: session, status } = useSession();
  const { socket, socketReady, realtimeOff, connectionFailed } = useAppSocket();
  const defaultNickname =
    session?.user?.username ?? session?.user?.name ?? "플레이어";

  const [screen, setScreen] = useState<"entry" | "room">("entry");
  const [nickname, setNickname] = useState(defaultNickname);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myId, setMyId] = useState("");
  const [roleModal, setRoleModal] = useState<RolePayload | null>(null);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [voteProgressText, setVoteProgressText] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultNickname) setNickname(defaultNickname);
  }, [defaultNickname]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLines]);

  const emitAck = useCallback(
    (event: string, payload: unknown) =>
      new Promise<Ack>((resolve) => {
        if (!socket?.connected) {
          resolve({ ok: false, error: "실시간 연결이 없습니다." });
          return;
        }
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, error: "서버 응답이 없습니다." });
        }, SOCKET_ACK_MS);
        socket.emit(event, payload, (res: Ack) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(res ?? { ok: false, error: "응답 없음" });
        });
      }),
    [socket]
  );

  useEffect(() => {
    if (!socket) return;

    const onRoomState = (data: RoomState) => {
      setRoom(data);
      if (data.phase === "result" && data.lastResult) setResult(data.lastResult);
      if (data.phase === "lobby") {
        setHasVoted(false);
        setChatLines([]);
        setResult(null);
      }
      if (data.phase === "voting" && data.voteProgress) {
        setVoteProgressText(`투표 ${data.voteProgress.voted}/${data.voteProgress.total}`);
      }
    };

    const onRole = (data: RolePayload) => setRoleModal(data);
    const onChat = (line: ChatLine) => setChatLines((prev) => [...prev, line]);
    const onGameStarted = () => {
      setHasVoted(false);
      setChatLines([]);
    };
    const onVoteStarted = () => setHasVoted(false);
    const onVoteUpdate = (data: { votedCount: number; total: number }) => {
      setVoteProgressText(`투표 ${data.votedCount}/${data.total}`);
    };
    const onResult = (data: GameResult) => setResult(data);
    const onAborted = (data: { reason?: string }) => {
      alert(data.reason ?? "게임이 중단되었습니다.");
    };

    socket.on("liar_room_state", onRoomState);
    socket.on("liar_your_role", onRole);
    socket.on("liar_chat_message", onChat);
    socket.on("liar_game_started", onGameStarted);
    socket.on("liar_vote_phase_started", onVoteStarted);
    socket.on("liar_vote_update", onVoteUpdate);
    socket.on("liar_game_result", onResult);
    socket.on("liar_game_aborted", onAborted);

    return () => {
      socket.off("liar_room_state", onRoomState);
      socket.off("liar_your_role", onRole);
      socket.off("liar_chat_message", onChat);
      socket.off("liar_game_started", onGameStarted);
      socket.off("liar_vote_phase_started", onVoteStarted);
      socket.off("liar_vote_update", onVoteUpdate);
      socket.off("liar_game_result", onResult);
      socket.off("liar_game_aborted", onAborted);
    };
  }, [socket]);

  async function createRoom() {
    setEntryError(null);
    const res = await emitAck("liar_create_room", { nickname });
    if (!res.ok) {
      setEntryError(res.error ?? "방 만들기 실패");
      return;
    }
    setMyId(res.playerId ?? "");
    setScreen("room");
  }

  async function joinRoom() {
    setEntryError(null);
    const res = await emitAck("liar_join_room", {
      nickname,
      code: roomCodeInput.trim().toUpperCase(),
    });
    if (!res.ok) {
      setEntryError(res.error ?? "입장 실패");
      return;
    }
    setMyId(res.playerId ?? "");
    setScreen("room");
  }

  async function startGame() {
    const res = await emitAck("liar_start_game", {});
    if (!res.ok) alert(res.error ?? "게임 시작 실패");
  }

  async function beginVote() {
    const res = await emitAck("liar_begin_vote", {});
    if (!res.ok) alert(res.error ?? "투표 시작 실패");
  }

  async function playAgain() {
    const res = await emitAck("liar_play_again", {});
    if (!res.ok) alert(res.error ?? "다시 시작 실패");
    setHasVoted(false);
    setChatLines([]);
    setResult(null);
  }

  async function castVote(targetId: string) {
    const res = await emitAck("liar_cast_vote", { targetId });
    if (!res.ok) {
      alert(res.error ?? "투표 실패");
      return;
    }
    setHasVoted(true);
    setVoteProgressText("투표를 완료했습니다. 다른 플레이어를 기다리는 중…");
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !socket?.connected) return;
    socket.emit("liar_chat_message", { message: text });
    setChatInput("");
  }

  if (status === "loading") {
    return <p className="p-6 text-sm text-muted-foreground">로딩 중…</p>;
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">라이어 게임</h1>
        <p className="mt-2 text-sm text-muted-foreground">플레이하려면 로그인이 필요합니다.</p>
        <Link
          href="/auth/signin?callbackUrl=/liar-game"
          className="mt-4 inline-block rounded-xl bg-folk-cobalt px-4 py-2 text-sm font-bold text-white"
        >
          로그인
        </Link>
      </div>
    );
  }

  if (realtimeOff || connectionFailed || !socketReady) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">라이어 게임</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          실시간 서버에 연결할 수 없습니다. NEXT_PUBLIC_SOCKET_URL 설정을 확인해 주세요.
        </p>
      </div>
    );
  }

  const isHost = room && myId === room.hostId;
  const phase = room?.phase ?? "lobby";

  return (
    <div className="mx-auto min-h-[80vh] max-w-lg px-4 py-6">
      {screen === "entry" ? (
        <>
          <header className="mb-5 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-folk-terracotta">MoCoMo Play Together</p>
            <h1 className="text-2xl font-bold">라이어 게임</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              제시어를 아는 시민 vs 모르는 라이어 · 3인 이상
            </p>
          </header>

          <div className="rounded-2xl border-2 border-folk-cobalt/25 bg-folk-cream/20 p-4 dark:bg-muted/20">
            <label className="mb-3 block text-xs text-muted-foreground">
              닉네임
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={createRoom}
              className="w-full rounded-xl bg-folk-cobalt py-2.5 text-sm font-bold text-white"
            >
              방 만들기 (Create)
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              또는
              <span className="h-px flex-1 bg-border" />
            </div>
            <label className="mb-3 block text-xs text-muted-foreground">
              방 번호
              <input
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="6자리 코드"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
              />
            </label>
            <button
              type="button"
              onClick={joinRoom}
              className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-bold"
            >
              입장 (Join)
            </button>
            {entryError ? <p className="mt-3 text-sm text-red-500">{entryError}</p> : null}
          </div>
        </>
      ) : (
        <>
          <header className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-folk-terracotta">방 번호</p>
              <h2 className="text-2xl font-bold tracking-widest">{room?.code ?? "------"}</h2>
            </div>
            <span className="rounded-full border border-folk-cobalt/30 bg-folk-cobalt/10 px-3 py-1 text-xs font-bold">
              {PHASE_LABELS[phase]}
            </span>
          </header>

          <div className="mb-3 rounded-2xl border-2 border-folk-cobalt/20 p-4">
            <h3 className="text-sm font-bold">플레이어 {room?.players.length ?? 0}명</h3>
            <ul className="mt-2 space-y-1">
              {room?.players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span>{p.nickname}</span>
                  {p.isHost ? <span className="text-xs font-bold text-folk-terracotta">방장</span> : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {phase === "lobby"
                ? `최소 ${room?.minPlayers ?? 3}명이 모이면 방장이 게임을 시작할 수 있습니다.`
                : phase === "discussion"
                  ? "자유롭게 토론하세요. 방장이 투표를 시작합니다."
                  : phase === "result"
                    ? "게임이 종료되었습니다."
                    : "라이어로 의심되는 사람에게 투표하세요."}
            </p>
            {isHost && phase === "lobby" && room?.canStart ? (
              <button type="button" onClick={startGame} className="mt-3 w-full rounded-xl bg-folk-cobalt py-2 text-sm font-bold text-white">
                게임 시작
              </button>
            ) : null}
            {isHost && phase === "discussion" ? (
              <button type="button" onClick={beginVote} className="mt-3 w-full rounded-xl bg-folk-cobalt py-2 text-sm font-bold text-white">
                투표 시작
              </button>
            ) : null}
            {isHost && phase === "result" ? (
              <button type="button" onClick={playAgain} className="mt-3 w-full rounded-xl border border-border py-2 text-sm font-bold">
                로비로 돌아가기
              </button>
            ) : null}
          </div>

          {(phase === "discussion" || phase === "voting") && (
            <div className="mb-3 rounded-2xl border-2 border-folk-cobalt/20 p-4">
              <h3 className="text-sm font-bold">토론 채팅</h3>
              <div className="mt-2 h-52 overflow-y-auto rounded-lg border border-border/60 bg-background/50 p-2">
                {chatLines.map((line) => (
                  <p key={`${line.at}-${line.playerId}`} className="mb-1 text-sm">
                    <span className="font-bold text-folk-cobalt">{line.nickname}</span> {line.message}
                  </p>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendChat} className="mt-2 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={500}
                  placeholder="메시지 입력..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-lg bg-folk-cobalt px-3 py-2 text-sm font-bold text-white">
                  전송
                </button>
              </form>
            </div>
          )}

          {phase === "voting" && room ? (
            <div className="mb-3 rounded-2xl border-2 border-folk-cobalt/20 p-4">
              <h3 className="text-sm font-bold">투표</h3>
              <div className="mt-2 grid gap-2">
                {room.players
                  .filter((p) => p.id !== myId)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={hasVoted}
                      onClick={() => castVote(p.id)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-left text-sm font-medium disabled:opacity-50"
                    >
                      {p.nickname}
                    </button>
                  ))}
              </div>
              {voteProgressText ? <p className="mt-2 text-xs text-muted-foreground">{voteProgressText}</p> : null}
            </div>
          ) : null}

          {phase === "result" && result ? (
            <div className="rounded-2xl border-2 border-folk-cobalt/20 p-4">
              <h3 className="text-sm font-bold">결과</h3>
              <div
                className={cn(
                  "mt-2 rounded-xl p-3 text-sm font-bold",
                  result.winner === "civilians"
                    ? "border border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                )}
              >
                {result.message}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                라이어: <strong>{result.liarNickname}</strong> · 제시어:{" "}
                <strong>{result.word}</strong> ({result.categoryLabel})
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                최다 득표: {result.mostVoted.map((p) => p.nickname).join(", ")} ({result.maxVotes}표) ·
                라이어 {result.liarCaught ? "적발" : "생존"}
              </p>
              <div className="mt-3 space-y-1">
                {result.tally.map((row) => (
                  <div key={row.id} className="flex justify-between text-xs">
                    <span>{row.nickname}</span>
                    <span>{row.votes}표</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {roleModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="닫기"
            onClick={() => setRoleModal(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border-2 border-folk-terracotta/40 bg-[#2a1f1f] p-5 shadow-xl">
            <p className="text-xs font-bold uppercase text-folk-terracotta">비밀 정보</p>
            <h2 className="mt-1 text-lg font-bold">
              {roleModal.role === "liar" ? "당신은 라이어입니다" : "당신은 시민입니다"}
            </h2>
            <p className="text-sm text-muted-foreground">카테고리: {roleModal.categoryLabel}</p>
            <p
              className={cn(
                "mt-2 text-3xl font-extrabold",
                roleModal.role === "liar" ? "text-red-400" : "text-green-400"
              )}
            >
              {roleModal.role === "civilian" ? roleModal.word : "???"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{roleModal.hint}</p>
            <button
              type="button"
              onClick={() => setRoleModal(null)}
              className="mt-4 w-full rounded-xl bg-folk-cobalt py-2 text-sm font-bold text-white"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
