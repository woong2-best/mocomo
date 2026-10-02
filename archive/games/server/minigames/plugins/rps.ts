import { rpsWinner } from "../../../src/lib/minigames/rps-logic";
import type { RpsChoice, RpsPublicState } from "../../../src/lib/minigames/shared-types";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type RpsGameState = {
  round: number;
  maxRounds: number;
  scores: Record<string, number>;
  phase: "pick" | "reveal" | "round_end" | "done";
  picks: Record<string, RpsChoice | null>;
  lastRound?: { picks: Record<string, RpsChoice>; winnerId: string | null };
  revealTimer?: ReturnType<typeof setTimeout>;
};

const REVEAL_MS = 2500;

function playerIds(room: MinigameRoomInternal): string[] {
  return [...room.players.keys()];
}

export const rpsPlugin: MinigamePlugin = {
  id: "rps",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = playerIds(room);
    const picks: Record<string, RpsChoice | null> = {};
    for (const id of ids) picks[id] = null;
    for (const p of room.players.values()) p.ready = true;
    return {
      round: 1,
      maxRounds: 3,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      phase: "pick" as const,
      picks,
    } satisfies RpsGameState;
  },

  toPublicState(room): RpsPublicState {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const gs = room.gameState as RpsGameState;
    return {
      ...base,
      game: {
        round: gs.round,
        maxRounds: gs.maxRounds,
        scores: { ...gs.scores },
        phase: gs.phase,
        picks: { ...gs.picks },
        lastRound: gs.lastRound,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const gs = room.gameState as RpsGameState;
    if (gs.phase !== "pick") return "선택 대기 중이 아닙니다.";
    const choice = move as RpsChoice;
    if (!["rock", "paper", "scissors"].includes(choice)) return "잘못된 선택입니다.";
    if (gs.picks[userId] != null) return "이미 선택했습니다.";
    return null;
  },

  applyMove(room, userId, move) {
    const gs = room.gameState as RpsGameState;
    gs.picks[userId] = move as RpsChoice;
    room.moveHistory.push({ userId, choice: move });

    const ids = playerIds(room);
    if (!ids.every((id) => gs.picks[id] != null)) return;

    const [a, b] = ids;
    const pickA = gs.picks[a!]!;
    const pickB = gs.picks[b!]!;
    const result = rpsWinner(pickA, pickB);
    let roundWinner: string | null = null;
    if (result === "a") {
      gs.scores[a!] = (gs.scores[a!] ?? 0) + 1;
      roundWinner = a!;
    } else if (result === "b") {
      gs.scores[b!] = (gs.scores[b!] ?? 0) + 1;
      roundWinner = b!;
    }
    gs.lastRound = { picks: { [a!]: pickA, [b!]: pickB }, winnerId: roundWinner };
    gs.phase = "reveal";

    if (gs.revealTimer) clearTimeout(gs.revealTimer);
    gs.revealTimer = setTimeout(() => {
      const maxScore = Math.max(...Object.values(gs.scores));
      if (maxScore >= 2 || gs.round >= gs.maxRounds) {
        gs.phase = "done";
        const winnerEntry = Object.entries(gs.scores).sort((x, y) => y[1] - x[1])[0];
        if (winnerEntry && winnerEntry[1] > 0) {
          const tied = Object.values(gs.scores).filter((s) => s === winnerEntry[1]).length;
          if (tied === 1) {
            room.winnerId = winnerEntry[0];
            room.resultMessage = "가위바위보 승리!";
            room.status = "finished";
          } else {
            room.winnerId = null;
            room.resultMessage = "무승부입니다.";
            room.status = "finished";
          }
        } else {
          room.winnerId = null;
          room.resultMessage = "무승부입니다.";
          room.status = "finished";
        }
      } else {
        gs.round += 1;
        gs.phase = "pick";
        for (const id of ids) gs.picks[id] = null;
        gs.lastRound = undefined;
      }
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
    }, REVEAL_MS);
    room.timers.push(gs.revealTimer);
  },

  checkWin(room) {
    if (room.status !== "finished" || !room.resultMessage) return null;
    if (room.winnerId) {
      return { winnerId: room.winnerId, resultMessage: room.resultMessage };
    }
    return { winnerId: "", resultMessage: room.resultMessage };
  },

  clearTimers(room) {
    const gs = room.gameState as RpsGameState | null;
    if (gs?.revealTimer) {
      clearTimeout(gs.revealTimer);
      gs.revealTimer = undefined;
    }
  },
};
