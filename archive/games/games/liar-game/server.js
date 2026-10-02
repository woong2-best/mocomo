const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const PORT = parseInt(process.env.LIAR_GAME_PORT || "4000", 10);
const MIN_PLAYERS = 3;

/** @type {Record<string, { label: string; words: string[] }>} */
const CATEGORIES = {
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

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} nickname
 * @property {string} socketId
 */

/**
 * @typedef {Object} Room
 * @property {string} code
 * @property {string} hostId
 * @property {Map<string, Player>} players
 * @property {'lobby'|'discussion'|'voting'|'result'} phase
 * @property {string|null} liarId
 * @property {string|null} word
 * @property {string|null} categoryKey
 * @property {string|null} categoryLabel
 * @property {Map<string, string>} votes
 * @property {object|null} lastResult
 */

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
  const keys = Object.keys(CATEGORIES);
  const categoryKey = keys[Math.floor(Math.random() * keys.length)];
  const category = CATEGORIES[categoryKey];
  const word = category.words[Math.floor(Math.random() * category.words.length)];
  return { categoryKey, categoryLabel: category.label, word };
}

function publicPlayers(room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    isHost: p.id === room.hostId,
  }));
}

function getPlayerBySocket(room, socketId) {
  for (const player of room.players.values()) {
    if (player.socketId === socketId) return player;
  }
  return null;
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (getPlayerBySocket(room, socketId)) return room;
  }
  return null;
}

function broadcastRoomState(io, room) {
  io.to(`liar:${room.code}`).emit("room_state", {
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

function startGame(io, room) {
  if (room.phase !== "lobby") return { ok: false, error: "이미 게임이 진행 중입니다." };
  if (room.players.size < MIN_PLAYERS) {
    return { ok: false, error: `최소 ${MIN_PLAYERS}명이 필요합니다.` };
  }

  const playerIds = Array.from(room.players.keys());
  const liarId = playerIds[Math.floor(Math.random() * playerIds.length)];
  const { categoryKey, categoryLabel, word } = pickRandomCategoryAndWord();

  room.phase = "discussion";
  room.liarId = liarId;
  room.word = word;
  room.categoryKey = categoryKey;
  room.categoryLabel = categoryLabel;
  room.votes = new Map();
  room.lastResult = null;

  for (const player of room.players.values()) {
    const target = io.sockets.sockets.get(player.socketId);
    if (!target) continue;
    if (player.id === liarId) {
      target.emit("your_role", {
        role: "liar",
        categoryLabel,
        hint: "당신은 라이어입니다. 제시어를 모르는 척 설명하세요.",
      });
    } else {
      target.emit("your_role", {
        role: "civilian",
        categoryLabel,
        word,
        hint: "제시어를 들키지 않게 설명하고 라이어를 찾으세요.",
      });
    }
  }

  io.to(`liar:${room.code}`).emit("game_started", {
    phase: "discussion",
    categoryLabel,
    playerCount: room.players.size,
  });

  broadcastRoomState(io, room);
  return { ok: true };
}

function beginVote(io, room) {
  if (room.phase !== "discussion") return { ok: false, error: "토론 단계에서만 투표를 시작할 수 있습니다." };
  room.phase = "voting";
  room.votes = new Map();
  io.to(`liar:${room.code}`).emit("vote_phase_started", {
    players: publicPlayers(room),
  });
  broadcastRoomState(io, room);
  return { ok: true };
}

function resolveVotes(io, room) {
  const voteCounts = {};
  for (const targetId of room.votes.values()) {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  let maxVotes = 0;
  /** @type {string[]} */
  let mostVoted = [];
  for (const [playerId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      mostVoted = [playerId];
    } else if (count === maxVotes) {
      mostVoted.push(playerId);
    }
  }

  const liarPlayer = room.players.get(room.liarId);
  const liarCaught = mostVoted.length === 1 && mostVoted[0] === room.liarId;
  const winner = liarCaught ? "civilians" : "liar";

  /** @type {{ id: string; nickname: string; votes: number }[]} */
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

  io.to(`liar:${room.code}`).emit("game_result", room.lastResult);
  broadcastRoomState(io, room);
}

function castVote(io, room, voterId, targetId) {
  if (room.phase !== "voting") return { ok: false, error: "투표 단계가 아닙니다." };
  if (!room.players.has(voterId)) return { ok: false, error: "플레이어를 찾을 수 없습니다." };
  if (!room.players.has(targetId)) return { ok: false, error: "투표 대상이 유효하지 않습니다." };
  if (voterId === targetId) return { ok: false, error: "자기 자신에게는 투표할 수 없습니다." };
  if (room.votes.has(voterId)) return { ok: false, error: "이미 투표했습니다." };

  room.votes.set(voterId, targetId);
  io.to(`liar:${room.code}`).emit("vote_update", {
    voterId,
    votedCount: room.votes.size,
    total: room.players.size,
  });
  broadcastRoomState(io, room);

  if (room.votes.size >= room.players.size) {
    resolveVotes(io, room);
  }
  return { ok: true };
}

function resetRoom(room) {
  room.phase = "lobby";
  room.liarId = null;
  room.word = null;
  room.categoryKey = null;
  room.categoryLabel = null;
  room.votes = new Map();
  room.lastResult = null;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/categories", (_req, res) => {
  res.json(
    Object.entries(CATEGORIES).map(([key, val]) => ({
      key,
      label: val.label,
      wordCount: val.words.length,
    }))
  );
});

io.on("connection", (socket) => {
  socket.on("create_room", ({ nickname }, ack) => {
    const name = String(nickname ?? "").trim().slice(0, 20);
    if (!name) {
      ack?.({ ok: false, error: "닉네임을 입력해 주세요." });
      return;
    }

    const code = generateRoomCode();
    const playerId = socket.id;
    /** @type {Room} */
    const room = {
      code,
      hostId: playerId,
      players: new Map([[playerId, { id: playerId, nickname: name, socketId: socket.id }]]),
      phase: "lobby",
      liarId: null,
      word: null,
      categoryKey: null,
      categoryLabel: null,
      votes: new Map(),
      lastResult: null,
    };
    rooms.set(code, room);
    socket.join(`liar:${code}`);
    socket.data.liarRoom = code;
    socket.data.playerId = playerId;

    ack?.({ ok: true, code, playerId, hostId: playerId });
    broadcastRoomState(io, room);
  });

  socket.on("join_room", ({ code, nickname }, ack) => {
    const roomCode = String(code ?? "")
      .trim()
      .toUpperCase();
    const name = String(nickname ?? "").trim().slice(0, 20);
    const room = rooms.get(roomCode);

    if (!room) {
      ack?.({ ok: false, error: "방을 찾을 수 없습니다." });
      return;
    }
    if (room.phase !== "lobby") {
      ack?.({ ok: false, error: "이미 게임이 시작된 방입니다." });
      return;
    }
    if (!name) {
      ack?.({ ok: false, error: "닉네임을 입력해 주세요." });
      return;
    }
    if (room.players.size >= 8) {
      ack?.({ ok: false, error: "방이 가득 찼습니다." });
      return;
    }

    const playerId = socket.id;
    room.players.set(playerId, { id: playerId, nickname: name, socketId: socket.id });
    socket.join(`liar:${roomCode}`);
    socket.data.liarRoom = roomCode;
    socket.data.playerId = playerId;

    ack?.({ ok: true, code: roomCode, playerId, hostId: room.hostId });
    broadcastRoomState(io, room);
  });

  socket.on("start_game", (_payload, ack) => {
    const room = findRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "방에 참여 중이 아닙니다." });
      return;
    }
    const player = getPlayerBySocket(room, socket.id);
    if (!player || player.id !== room.hostId) {
      ack?.({ ok: false, error: "방장만 게임을 시작할 수 있습니다." });
      return;
    }
    const result = startGame(io, room);
    ack?.(result);
  });

  socket.on("begin_vote", (_payload, ack) => {
    const room = findRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "방에 참여 중이 아닙니다." });
      return;
    }
    const player = getPlayerBySocket(room, socket.id);
    if (!player || player.id !== room.hostId) {
      ack?.({ ok: false, error: "방장만 투표를 시작할 수 있습니다." });
      return;
    }
    const result = beginVote(io, room);
    ack?.(result);
  });

  socket.on("chat_message", ({ message }) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase === "lobby" || room.phase === "result") return;
    const player = getPlayerBySocket(room, socket.id);
    if (!player) return;

    const text = String(message ?? "").trim().slice(0, 500);
    if (!text) return;

    io.to(`liar:${room.code}`).emit("chat_message", {
      playerId: player.id,
      nickname: player.nickname,
      message: text,
      at: Date.now(),
    });
  });

  socket.on("cast_vote", ({ targetId }, ack) => {
    const room = findRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "방에 참여 중이 아닙니다." });
      return;
    }
    const voter = getPlayerBySocket(room, socket.id);
    if (!voter) {
      ack?.({ ok: false, error: "플레이어를 찾을 수 없습니다." });
      return;
    }
    const result = castVote(io, room, voter.id, String(targetId ?? ""));
    ack?.(result);
  });

  socket.on("play_again", (_payload, ack) => {
    const room = findRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "방에 참여 중이 아닙니다." });
      return;
    }
    const player = getPlayerBySocket(room, socket.id);
    if (!player || player.id !== room.hostId) {
      ack?.({ ok: false, error: "방장만 다시 시작할 수 있습니다." });
      return;
    }
    resetRoom(room);
    broadcastRoomState(io, room);
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;

    const player = getPlayerBySocket(room, socket.id);
    if (!player) return;

    room.players.delete(player.id);
    if (room.players.size === 0) {
      rooms.delete(room.code);
      return;
    }

    if (room.hostId === player.id) {
      room.hostId = room.players.keys().next().value;
    }

    if (room.phase !== "lobby" && room.players.size < MIN_PLAYERS) {
      resetRoom(room);
      io.to(`liar:${room.code}`).emit("game_aborted", {
        reason: "플레이어가 부족해 로비로 돌아갑니다.",
      });
    }

    broadcastRoomState(io, room);
  });
});

server.listen(PORT, () => {
  console.log(`Liar Game server running on http://localhost:${PORT}`);
});
