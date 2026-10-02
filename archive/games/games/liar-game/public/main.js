const socket = io();

const $ = (id) => document.getElementById(id);

const screenLobby = $("screen-lobby");
const screenRoom = $("screen-room");
const nicknameInput = $("nickname-input");
const roomCodeInput = $("room-code-input");
const lobbyError = $("lobby-error");
const roomCodeDisplay = $("room-code-display");
const phaseBadge = $("phase-badge");
const playerCount = $("player-count");
const playerList = $("player-list");
const roomHint = $("room-hint");
const btnCreate = $("btn-create");
const btnJoin = $("btn-join");
const btnStart = $("btn-start");
const btnBeginVote = $("btn-begin-vote");
const btnPlayAgain = $("btn-play-again");
const chatPanel = $("chat-panel");
const chatLog = $("chat-log");
const chatForm = $("chat-form");
const chatInput = $("chat-input");
const votePanel = $("vote-panel");
const voteOptions = $("vote-options");
const voteProgress = $("vote-progress");
const resultPanel = $("result-panel");
const resultBody = $("result-body");
const roleModal = $("role-modal");
const roleTitle = $("role-title");
const roleLabel = $("role-label");
const roleCategory = $("role-category");
const roleWord = $("role-word");
const roleHint = $("role-hint");
const btnCloseRole = $("btn-close-role");

/** @type {{ playerId: string; hostId: string; code: string; hasVoted: boolean }} */
const state = {
  playerId: "",
  hostId: "",
  code: "",
  hasVoted: false,
};

const PHASE_LABELS = {
  lobby: "로비",
  discussion: "토론",
  voting: "투표",
  result: "결과",
};

function showError(msg) {
  lobbyError.textContent = msg;
  lobbyError.classList.remove("hidden");
}

function clearError() {
  lobbyError.textContent = "";
  lobbyError.classList.add("hidden");
}

function showScreen(name) {
  screenLobby.classList.toggle("active", name === "lobby");
  screenRoom.classList.toggle("active", name === "room");
}

function emitAck(event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (res) => resolve(res ?? { ok: false, error: "응답 없음" }));
  });
}

function showRoleModal(data) {
  roleTitle.textContent = data.role === "liar" ? "당신은 라이어입니다" : "당신은 시민입니다";
  roleLabel.textContent = data.role === "liar" ? "LIAR" : "CIVILIAN";
  roleLabel.className = `role-label ${data.role === "liar" ? "liar" : "civilian"}`;
  roleCategory.textContent = `카테고리: ${data.categoryLabel}`;
  if (data.role === "civilian" && data.word) {
    roleWord.textContent = data.word;
    roleWord.classList.remove("hidden");
  } else {
    roleWord.textContent = "???";
    roleWord.classList.remove("hidden");
  }
  roleHint.textContent = data.hint ?? "";
  roleModal.classList.remove("hidden");
}

function hideRoleModal() {
  roleModal.classList.add("hidden");
}

function renderPlayers(players) {
  playerList.innerHTML = "";
  for (const p of players) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(p.nickname)}</span>${p.isHost ? '<span class="host-tag">방장</span>' : ""}`;
    playerList.appendChild(li);
  }
  playerCount.textContent = String(players.length);
}

function renderVoteOptions(players) {
  voteOptions.innerHTML = "";
  for (const p of players) {
    if (p.id === state.playerId) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn secondary";
    btn.textContent = p.nickname;
    btn.disabled = state.hasVoted;
    btn.addEventListener("click", async () => {
      const res = await emitAck("cast_vote", { targetId: p.id });
      if (!res.ok) {
        alert(res.error ?? "투표 실패");
        return;
      }
      state.hasVoted = true;
      btn.textContent = `${p.nickname} ✓`;
      voteProgress.textContent = "투표를 완료했습니다. 다른 플레이어를 기다리는 중…";
      for (const el of voteOptions.querySelectorAll("button")) {
        el.disabled = true;
      }
    });
    voteOptions.appendChild(btn);
  }
}

function renderResult(result) {
  resultBody.innerHTML = "";
  const banner = document.createElement("div");
  banner.className = `result-banner ${result.winner === "civilians" ? "win-civilians" : "win-liar"}`;
  banner.textContent = result.message;
  resultBody.appendChild(banner);

  const info = document.createElement("p");
  info.className = "hint";
  info.innerHTML = `라이어: <strong>${escapeHtml(result.liarNickname)}</strong> · 제시어: <strong>${escapeHtml(result.word)}</strong> (${escapeHtml(result.categoryLabel)})`;
  resultBody.appendChild(info);

  const voted = document.createElement("p");
  voted.className = "hint";
  const names = result.mostVoted.map((p) => p.nickname).join(", ");
  voted.textContent = `최다 득표: ${names} (${result.maxVotes}표) · 라이어 ${result.liarCaught ? "적발" : "생존"}`;
  resultBody.appendChild(voted);

  const tallyTitle = document.createElement("p");
  tallyTitle.textContent = "득표 현황";
  tallyTitle.style.marginTop = "0.75rem";
  resultBody.appendChild(tallyTitle);

  for (const row of result.tally) {
    const line = document.createElement("div");
    line.className = "tally-row";
    line.innerHTML = `<span>${escapeHtml(row.nickname)}</span><span>${row.votes}표</span>`;
    resultBody.appendChild(line);
  }
}

function applyRoomState(data) {
  state.code = data.code;
  state.hostId = data.hostId;
  roomCodeDisplay.textContent = data.code;
  phaseBadge.textContent = PHASE_LABELS[data.phase] ?? data.phase;
  renderPlayers(data.players);

  const isHost = state.playerId === data.hostId;

  btnStart.classList.toggle("hidden", !(data.phase === "lobby" && isHost && data.canStart));
  btnBeginVote.classList.toggle("hidden", !(data.phase === "discussion" && isHost));
  btnPlayAgain.classList.toggle("hidden", !(data.phase === "result" && isHost));

  chatPanel.classList.toggle("hidden", data.phase !== "discussion" && data.phase !== "voting");
  votePanel.classList.toggle("hidden", data.phase !== "voting");
  resultPanel.classList.toggle("hidden", data.phase !== "result");

  if (data.phase === "lobby") {
    roomHint.textContent = `최소 ${data.minPlayers}명이 모이면 방장이 게임을 시작할 수 있습니다.`;
    chatLog.innerHTML = "";
    state.hasVoted = false;
  }

  if (data.phase === "discussion") {
    roomHint.textContent = "자유롭게 토론하세요. 방장이 투표를 시작합니다.";
  }

  if (data.phase === "voting") {
    renderVoteOptions(data.players);
    if (data.voteProgress) {
      voteProgress.textContent = `투표 ${data.voteProgress.voted}/${data.voteProgress.total}`;
    }
  }

  if (data.phase === "result" && data.lastResult) {
    renderResult(data.lastResult);
    roomHint.textContent = "게임이 종료되었습니다.";
  }
}

function appendChat(line) {
  const div = document.createElement("div");
  div.className = "chat-line";
  div.innerHTML = `<span class="name">${escapeHtml(line.nickname)}</span>${escapeHtml(line.message)}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

btnCreate.addEventListener("click", async () => {
  clearError();
  const nickname = nicknameInput.value.trim();
  const res = await emitAck("create_room", { nickname });
  if (!res.ok) {
    showError(res.error ?? "방 만들기 실패");
    return;
  }
  state.playerId = res.playerId;
  state.hostId = res.hostId;
  state.code = res.code;
  showScreen("room");
});

btnJoin.addEventListener("click", async () => {
  clearError();
  const nickname = nicknameInput.value.trim();
  const code = roomCodeInput.value.trim().toUpperCase();
  const res = await emitAck("join_room", { nickname, code });
  if (!res.ok) {
    showError(res.error ?? "입장 실패");
    return;
  }
  state.playerId = res.playerId;
  state.hostId = res.hostId;
  state.code = res.code;
  showScreen("room");
});

btnStart.addEventListener("click", async () => {
  const res = await emitAck("start_game", {});
  if (!res.ok) alert(res.error ?? "게임 시작 실패");
});

btnBeginVote.addEventListener("click", async () => {
  const res = await emitAck("begin_vote", {});
  if (!res.ok) alert(res.error ?? "투표 시작 실패");
});

btnPlayAgain.addEventListener("click", async () => {
  const res = await emitAck("play_again", {});
  if (!res.ok) alert(res.error ?? "다시 시작 실패");
  state.hasVoted = false;
  chatLog.innerHTML = "";
  resultBody.innerHTML = "";
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  socket.emit("chat_message", { message });
  chatInput.value = "";
});

btnCloseRole.addEventListener("click", hideRoleModal);
roleModal.querySelector(".modal-backdrop")?.addEventListener("click", hideRoleModal);

socket.on("room_state", applyRoomState);
socket.on("your_role", showRoleModal);
socket.on("game_started", () => {
  state.hasVoted = false;
  chatLog.innerHTML = "";
});
socket.on("vote_phase_started", () => {
  state.hasVoted = false;
});
socket.on("vote_update", (data) => {
  voteProgress.textContent = `투표 ${data.votedCount}/${data.total}`;
});
socket.on("chat_message", appendChat);
socket.on("game_result", renderResult);
socket.on("game_aborted", (data) => {
  alert(data.reason ?? "게임이 중단되었습니다.");
});

socket.on("connect_error", () => {
  showError("서버에 연결할 수 없습니다. server.js가 실행 중인지 확인하세요.");
});
