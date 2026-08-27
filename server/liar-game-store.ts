import type { Server } from "socket.io";

const MIN_PLAYERS = 3;

export const LIAR_GAME_CATEGORIES = {
  fruits: {
    label: "과일",
    words: ["사과", "바나나", "포도", "수박", "딸기"],
  },
  animals: {
    label: "동물",
    words: ["고양이", "강아지", "코끼리", "펭귄", "토끼"],
  },
  electronics: {
    label: "전자기기",
    words: ["스마트폰", "노트북", "이어폰", "TV", "태블릿"],
  },
};

type Player = {
  userId: string;
  nickname: string;
  socketId: string;
};

type Room = {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  phase: "lobby" | "discussion" | "voting" | "result";
  liarId: string | null;
  word: string | null;
  categoryKey: string | null;
  categoryLabel: string | null;
  votes: Map<string, string>;
  lastResult: Record<string, unknown> | null;
};

const rooms = new Map<string, Room>();
let ioRef: Server | null = null;

export function initLiarGameStore(io: Server) {
  ioRef = io;
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function pickRandomCategoryAndWord() {
  const keys = Object.keys(LIAR_GAME_CATEGORIES);
  const categoryKey = keys[Math.floor(Math.random() * keys.length)]!;
  const category = LIAR_GAME_CATEGORIES[categoryKey as keyof typeof LIAR_GAME_CATEGORIES];
  const word = category.words[Math.floor(Math.random() * category.words.length)]!;
  return { categoryKey, categoryLabel: category.label, word };
}

function publicPlayers(room: Room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.userId,
    nickname: p.nickname,
    isHost: p.userId === room.hostId,
  }));
}

function getPlayerByUserId(room: Room, userId: string) {
  return room.players.get(userId) ?? null;
}

function findRoomBySocket(socketId: string) {
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if (player.socketId === socketId) return room;
    }
  }
  return null;
}

function broadcastRoomState(room: Room) {
  if (!ioRef) return;
  ioRef.to(`liar:${room.code}`).emit("liar_room_state", {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    players: publicPlayers(room),
    minPlayers: MIN_PLAYERS,
    canStart: room.phase === "lobby" && room.players.size >= MIN_PLAYERS,
    voteProgress:
      room.phase === "voting"
        ? { voted: room.votes.size, total: room.players.size }
        : null,
    lastResult: room.phase === "result" ? room.lastResult : null,
  });
}

function startGame(room: Room) {
  if (room.phase !== "lobby") return { ok: false as const, error: "이미 게임이 진행 중입니다." };
  if (room.players.size < MIN_PLAYERS) {
    return { ok: false as const, error: `최소 ${MIN_PLAYERS}명이 필요합니다.` };
  }

  const playerIds = Array.from(room.players.keys());
  const liarId = playerIds[Math.floor(Math.random() * playerIds.length)]!;
  const { categoryKey, categoryLabel, word } = pickRandomCategoryAndWord();

  room.phase = "discussion";
  room.liarId = liarId;
  room.word = word;
  room.categoryKey = categoryKey;
  room.categoryLabel = categoryLabel;
  room.votes = new Map();
  room.lastResult = null;

  if (ioRef) {
    for (const player of room.players.values()) {
      const target = ioRef.sockets.sockets.get(player.socketId);
      if (!target) continue;
      if (player.userId === liarId) {
        target.emit("liar_your_role", {
          role: "liar",
          categoryLabel,
          hint: "당신은 라이어입니다. 제시어를 모르는 척 설명하세요.",
        });
      } else {
        target.emit("liar_your_role", {
          role: "civilian",
          categoryLabel,
          word,
          hint: "제시어를 들키지 않게 설명하고 라이어를 찾으세요.",
        });
      }
    }

    ioRef.to(`liar:${room.code}`).emit("liar_game_started", {
      phase: "discussion",
      categoryLabel,
      playerCount: room.players.size,
    });
  }

  broadcastRoomState(room);
  return { ok: true as const };
}

function beginVote(room: Room) {
  if (room.phase !== "discussion") {
    return { ok: false as const, error: "토론 단계에서만 투표를 시작할 수 있습니다." };
  }
  room.phase = "voting";
  room.votes = new Map();
  ioRef?.to(`liar:${room.code}`).emit("liar_vote_phase_started", {
    players: publicPlayers(room),
  });
  broadcastRoomState(room);
  return { ok: true as const };
}

function resolveVotes(room: Room) {
  const voteCounts: Record<string, number> = {};
  for (const targetId of room.votes.values()) {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  let maxVotes = 0;
  let mostVoted: string[] = [];
  for (const [playerId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      mostVoted = [playerId];
    } else if (count === maxVotes) {
      mostVoted.push(playerId);
    }
  }

  const liarPlayer = room.liarId ? room.players.get(room.liarId) : null;
  const liarCaught = mostVoted.length === 1 && mostVoted[0] === room.liarId;
  const winner = liarCaught ? "civilians" : "liar";

  const tally = publicPlayers(room).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    votes: voteCounts[p.id] || 0,
  }));

  const mostVotedPlayers = mostVoted.map((id) => {
    const p = room.players.get(id);
    return { id, nickname: p?.nickname ?? "?" };
  });

  room.phase = "result";
  room.lastResult = {
    winner,
    liarId: room.liarId,
    liarNickname: liarPlayer?.nickname ?? "?",
    word: room.word,
    categoryLabel: room.categoryLabel,
    mostVoted: mostVotedPlayers,
    maxVotes,
    liarCaught,
    tally,
    message: liarCaught
      ? "시민 승리! 라이어를 찾아냈습니다."
      : "라이어 승리! 라이어가 들키지 않았습니다.",
  };

  ioRef?.to(`liar:${room.code}`).emit("liar_game_result", room.lastResult);
  broadcastRoomState(room);
}

function castVote(room: Room, voterId: string, targetId: string) {
  if (room.phase !== "voting") return { ok: false as const, error: "투표 단계가 아닙니다." };
  if (!room.players.has(voterId)) return { ok: false as const, error: "플레이어를 찾을 수 없습니다." };
  if (!room.players.has(targetId)) return { ok: false as const, error: "투표 대상이 유효하지 않습니다." };
  if (voterId === targetId) return { ok: false as const, error: "자기 자신에게는 투표할 수 없습니다." };
  if (room.votes.has(voterId)) return { ok: false as const, error: "이미 투표했습니다." };

  room.votes.set(voterId, targetId);
  ioRef?.to(`liar:${room.code}`).emit("liar_vote_update", {
    voterId,
    votedCount: room.votes.size,
    total: room.players.size,
  });
  broadcastRoomState(room);

  if (room.votes.size >= room.players.size) {
    resolveVotes(room);
  }
  return { ok: true as const };
}

function resetRoom(room: Room) {
  room.phase = "lobby";
  room.liarId = null;
  room.word = null;
  room.categoryKey = null;
  room.categoryLabel = null;
  room.votes = new Map();
  room.lastResult = null;
}

export function liarGameCreateRoom(userId: string, nickname: string, socketId: string) {
  const name = nickname.trim().slice(0, 20);
  if (!name) return { ok: false as const, error: "닉네임을 입력해 주세요." };

  const code = generateRoomCode();
  const room: Room = {
    code,
    hostId: userId,
    players: new Map([[userId, { userId, nickname: name, socketId }]]),
    phase: "lobby",
    liarId: null,
    word: null,
    categoryKey: null,
    categoryLabel: null,
    votes: new Map(),
    lastResult: null,
  };
  rooms.set(code, room);
  broadcastRoomState(room);
  return { ok: true as const, code, playerId: userId, hostId: userId, room };
}

export function liarGameJoinRoom(code: string, userId: string, nickname: string, socketId: string) {
  const roomCode = code.trim().toUpperCase();
  const name = nickname.trim().slice(0, 20);
  const room = rooms.get(roomCode);

  if (!room) return { ok: false as const, error: "방을 찾을 수 없습니다." };
  if (room.phase !== "lobby") return { ok: false as const, error: "이미 게임이 시작된 방입니다." };
  if (!name) return { ok: false as const, error: "닉네임을 입력해 주세요." };
  if (room.players.size >= 8) return { ok: false as const, error: "방이 가득 찼습니다." };

  room.players.set(userId, { userId, nickname: name, socketId });
  broadcastRoomState(room);
  return { ok: true as const, code: roomCode, playerId: userId, hostId: room.hostId, room };
}

export function liarGameStart(room: Room, userId: string) {
  if (userId !== room.hostId) return { ok: false as const, error: "방장만 게임을 시작할 수 있습니다." };
  return startGame(room);
}

export function liarGameBeginVote(room: Room, userId: string) {
  if (userId !== room.hostId) return { ok: false as const, error: "방장만 투표를 시작할 수 있습니다." };
  return beginVote(room);
}

export function liarGamePlayAgain(room: Room, userId: string) {
  if (userId !== room.hostId) return { ok: false as const, error: "방장만 다시 시작할 수 있습니다." };
  resetRoom(room);
  broadcastRoomState(room);
  return { ok: true as const };
}

export function liarGameChat(room: Room, userId: string, message: string) {
  if (room.phase === "lobby" || room.phase === "result") return null;
  const player = getPlayerByUserId(room, userId);
  if (!player) return null;
  const text = message.trim().slice(0, 500);
  if (!text) return null;
  return {
    playerId: player.userId,
    nickname: player.nickname,
    message: text,
    at: Date.now(),
  };
}

export function liarGameCastVote(room: Room, voterId: string, targetId: string) {
  return castVote(room, voterId, targetId);
}

export function liarGameHandleDisconnect(socketId: string) {
  const room = findRoomBySocket(socketId);
  if (!room) return;

  let disconnectedUserId: string | null = null;
  for (const [userId, player] of room.players.entries()) {
    if (player.socketId === socketId) {
      disconnectedUserId = userId;
      room.players.delete(userId);
      break;
    }
  }
  if (!disconnectedUserId) return;

  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === disconnectedUserId) {
    room.hostId = room.players.keys().next().value!;
  }

  if (room.phase !== "lobby" && room.players.size < MIN_PLAYERS) {
    resetRoom(room);
    ioRef?.to(`liar:${room.code}`).emit("liar_game_aborted", {
      reason: "플레이어가 부족해 로비로 돌아갑니다.",
    });
  }

  broadcastRoomState(room);
}

export function liarGameFindRoomByUserId(userId: string) {
  for (const room of rooms.values()) {
    if (room.players.has(userId)) return room;
  }
  return null;
}

export function liarGameUpdateSocket(room: Room, userId: string, socketId: string) {
  const player = room.players.get(userId);
  if (player) player.socketId = socketId;
}
