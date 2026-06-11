import type { Server } from "socket.io";
import type {
  SketchQuizPublicState,
  SketchStroke,
  SketchQuizGuess,
} from "../src/lib/sketch-quiz-types";
import {
  type SketchWordEntry,
  pickRandomSketchWord,
  isSketchAnswerCorrect,
} from "../src/lib/sketch-quiz-words";

const ROUND_SECONDS = 80;
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 2;
const ROUND_END_PAUSE_MS = 4000;

type PlayerInternal = {
  userId: string;
  username: string;
  score: number;
  socketId: string;
};

type RoomInternal = {
  id: string;
  hostId: string;
  status: "lobby" | "playing" | "round_end" | "finished";
  players: Map<string, PlayerInternal>;
  drawerOrder: string[];
  drawerIndex: number;
  round: number;
  maxRounds: number;
  currentWord: SketchWordEntry | null;
  strokes: SketchStroke[];
  recentGuesses: SketchQuizGuess[];
  usedWords: Set<string>;
  roundEndsAt: number | null;
  roundTimer: ReturnType<typeof setInterval> | null;
  roundEndTimer: ReturnType<typeof setTimeout> | null;
  lastCorrect: { userId: string; username: string; word: string } | null;
  roundMessage: string | null;
};

const rooms = new Map<string, RoomInternal>();
let ioRef: Server | null = null;

function roomKey(roomId: string) {
  return `sketch:${roomId.toUpperCase()}`;
}

function clearRoomTimers(room: RoomInternal) {
  if (room.roundTimer) {
    clearInterval(room.roundTimer);
    room.roundTimer = null;
  }
  if (room.roundEndTimer) {
    clearTimeout(room.roundEndTimer);
    room.roundEndTimer = null;
  }
}

function getTimeLeft(room: RoomInternal): number {
  if (!room.roundEndsAt || room.status !== "playing") return 0;
  return Math.max(0, Math.ceil((room.roundEndsAt - Date.now()) / 1000));
}

function toPublicState(room: RoomInternal): SketchQuizPublicState {
  const drawerId =
    room.status === "playing" || room.status === "round_end"
      ? room.drawerOrder[room.drawerIndex] ?? null
      : null;

  return {
    roomId: room.id,
    hostId: room.hostId,
    status: room.status,
    players: [...room.players.values()].map((p) => ({
      userId: p.userId,
      username: p.username,
      score: p.score,
      isHost: p.userId === room.hostId,
      isDrawer: p.userId === drawerId,
    })),
    round: room.round,
    maxRounds: room.maxRounds,
    drawerId,
    category: room.currentWord?.category ?? null,
    wordLength: room.currentWord?.word.replace(/\s/g, "").length ?? 0,
    timeLeft: getTimeLeft(room),
    strokes: room.strokes,
    recentGuesses: room.recentGuesses.slice(-30),
    lastCorrect: room.lastCorrect,
    roundMessage: room.roundMessage,
  };
}

function emitState(room: RoomInternal) {
  if (!ioRef) return;
  ioRef.to(roomKey(room.id)).emit("sketch_quiz_state", toPublicState(room));
}

function emitWordToDrawer(room: RoomInternal) {
  if (!ioRef || !room.currentWord) return;
  const drawerId = room.drawerOrder[room.drawerIndex];
  if (!drawerId) return;
  const player = room.players.get(drawerId);
  if (!player) return;
  ioRef.to(player.socketId).emit("sketch_quiz_word", {
    word: room.currentWord.word,
    category: room.currentWord.category,
  });
}

function startRound(room: RoomInternal) {
  clearRoomTimers(room);
  room.strokes = [];
  room.recentGuesses = [];
  room.lastCorrect = null;
  room.roundMessage = null;
  room.currentWord = pickRandomSketchWord(room.usedWords);
  room.usedWords.add(room.currentWord.word);
  room.roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
  room.status = "playing";

  emitState(room);
  emitWordToDrawer(room);
  ioRef?.to(roomKey(room.id)).emit("sketch_quiz_clear");

  room.roundTimer = setInterval(() => {
    const left = getTimeLeft(room);
    if (left <= 0) {
      endRound(room, null);
      return;
    }
    ioRef?.to(roomKey(room.id)).emit("sketch_quiz_tick", { timeLeft: left });
  }, 1000);
}

function endRound(
  room: RoomInternal,
  winner: { userId: string; username: string } | null
) {
  clearRoomTimers(room);
  room.status = "round_end";
  room.roundEndsAt = null;

  if (winner && room.currentWord) {
    room.lastCorrect = {
      userId: winner.userId,
      username: winner.username,
      word: room.currentWord.word,
    };
    room.roundMessage = `${winner.username}님이 정답!`;
  } else if (room.currentWord) {
    room.roundMessage = `시간 초과! 정답: ${room.currentWord.word}`;
  }

  emitState(room);

  room.roundEndTimer = setTimeout(() => {
    if (room.round >= room.maxRounds) {
      finishGame(room);
      return;
    }
    room.round += 1;
    room.drawerIndex = (room.drawerIndex + 1) % room.drawerOrder.length;
    startRound(room);
  }, ROUND_END_PAUSE_MS);
}

function finishGame(room: RoomInternal) {
  clearRoomTimers(room);
  room.status = "finished";
  room.roundMessage = "게임 종료!";
  emitState(room);
}

function ensureHost(room: RoomInternal, userId: string): boolean {
  return room.hostId === userId;
}

export function initSketchQuizStore(io: Server) {
  ioRef = io;
}

export function sketchQuizCreate(
  roomId: string,
  userId: string,
  username: string,
  socketId: string
): { ok: true; state: SketchQuizPublicState } | { ok: false; error: string } {
  const id = roomId.toUpperCase();
  if (rooms.has(id)) {
    return { ok: false, error: "이미 존재하는 방 코드입니다." };
  }

  const room: RoomInternal = {
    id,
    hostId: userId,
    status: "lobby",
    players: new Map(),
    drawerOrder: [],
    drawerIndex: 0,
    round: 1,
    maxRounds: 0,
    currentWord: null,
    strokes: [],
    recentGuesses: [],
    usedWords: new Set(),
    roundEndsAt: null,
    roundTimer: null,
    roundEndTimer: null,
    lastCorrect: null,
    roundMessage: null,
  };

  room.players.set(userId, { userId, username, score: 0, socketId });
  rooms.set(id, room);

  return { ok: true, state: toPublicState(room) };
}

export function sketchQuizJoin(
  roomId: string,
  userId: string,
  username: string,
  socketId: string
): { ok: true; state: SketchQuizPublicState } | { ok: false; error: string } {
  const id = roomId.toUpperCase();
  const room = rooms.get(id);
  if (!room) return { ok: false, error: "방을 찾을 수 없습니다." };
  if (room.status !== "lobby" && !room.players.has(userId)) {
    return { ok: false, error: "이미 진행 중인 게임입니다." };
  }
  if (room.players.size >= MAX_PLAYERS && !room.players.has(userId)) {
    return { ok: false, error: "방이 가득 찼습니다." };
  }

  room.players.set(userId, {
    userId,
    username,
    score: room.players.get(userId)?.score ?? 0,
    socketId,
  });

  return { ok: true, state: toPublicState(room) };
}

export function sketchQuizLeave(roomId: string, userId: string) {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return;

  room.players.delete(userId);
  room.drawerOrder = room.drawerOrder.filter((id) => id !== userId);

  if (room.players.size === 0) {
    clearRoomTimers(room);
    rooms.delete(room.id);
    return;
  }

  if (room.hostId === userId) {
    const next = room.players.values().next().value as PlayerInternal;
    room.hostId = next.userId;
  }

  if (room.status === "playing") {
    const drawerId = room.drawerOrder[room.drawerIndex];
    if (drawerId === userId || !drawerId) {
      endRound(room, null);
    }
  }

  emitState(room);
}

export function sketchQuizStart(
  roomId: string,
  userId: string
): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { ok: false, error: "방을 찾을 수 없습니다." };
  if (!ensureHost(room, userId)) return { ok: false, error: "방장만 시작할 수 있습니다." };
  if (room.status !== "lobby") return { ok: false, error: "이미 게임이 시작되었습니다." };
  if (room.players.size < MIN_PLAYERS) {
    return { ok: false, error: `최소 ${MIN_PLAYERS}명이 필요합니다.` };
  }

  room.drawerOrder = [...room.players.keys()];
  room.drawerIndex = 0;
  room.round = 1;
  room.maxRounds = room.drawerOrder.length * 2;
  room.usedWords.clear();
  startRound(room);
  return { ok: true };
}

export function sketchQuizStroke(
  roomId: string,
  userId: string,
  stroke: SketchStroke
): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room || room.status !== "playing") return { ok: false, error: "그릴 수 없습니다." };
  const drawerId = room.drawerOrder[room.drawerIndex];
  if (drawerId !== userId) return { ok: false, error: "출제자만 그릴 수 있습니다." };

  room.strokes.push(stroke);
  ioRef?.to(roomKey(room.id)).emit("sketch_quiz_stroke", stroke);
  return { ok: true };
}

export function sketchQuizClear(
  roomId: string,
  userId: string
): { ok: true } | { ok: false; error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room || room.status !== "playing") return { ok: false, error: "지울 수 없습니다." };
  const drawerId = room.drawerOrder[room.drawerIndex];
  if (drawerId !== userId) return { ok: false, error: "출제자만 지울 수 있습니다." };

  room.strokes = [];
  ioRef?.to(roomKey(room.id)).emit("sketch_quiz_clear");
  return { ok: true };
}

export function sketchQuizGuess(
  roomId: string,
  userId: string,
  username: string,
  text: string
): { ok: true; correct?: boolean } | { ok: false; error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room || room.status !== "playing") return { ok: false, error: "추측할 수 없습니다." };
  const drawerId = room.drawerOrder[room.drawerIndex];
  if (drawerId === userId) return { ok: false, error: "출제자는 추측할 수 없습니다." };
  if (!room.currentWord) return { ok: false, error: "라운드가 없습니다." };

  const trimmed = text.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "내용을 입력하세요." };

  const correct = isSketchAnswerCorrect(trimmed, room.currentWord);
  const guess: SketchQuizGuess = {
    userId,
    username,
    text: correct ? room.currentWord.word : trimmed,
    correct,
    at: Date.now(),
  };
  room.recentGuesses.push(guess);
  ioRef?.to(roomKey(room.id)).emit("sketch_quiz_guess", guess);

  if (correct) {
    const guesser = room.players.get(userId);
    const drawer = drawerId ? room.players.get(drawerId) : null;
    if (guesser) guesser.score += 10;
    if (drawer) drawer.score += 5;
    endRound(room, { userId, username });
    emitState(room);
    return { ok: true, correct: true };
  }

  emitState(room);
  return { ok: true, correct: false };
}

export function sketchQuizGetState(roomId: string): SketchQuizPublicState | null {
  const room = rooms.get(roomId.toUpperCase());
  return room ? toPublicState(room) : null;
}

export function sketchQuizUpdateSocket(
  roomId: string,
  userId: string,
  socketId: string
) {
  const room = rooms.get(roomId.toUpperCase());
  const player = room?.players.get(userId);
  if (player) player.socketId = socketId;
}

export function sketchQuizReplayWord(roomId: string, userId: string) {
  const room = rooms.get(roomId.toUpperCase());
  if (!room || room.status !== "playing") return;
  const drawerId = room.drawerOrder[room.drawerIndex];
  if (drawerId !== userId) return;
  emitWordToDrawer(room);
}
