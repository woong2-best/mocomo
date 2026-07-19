/** MoCoMo Activity Platform — 공통 타입 (게임·실시간 활동 확장용) */

export type ActivityCategory =
  | "game"
  | "creative"
  | "watch"
  | "focus"
  | "social"
  | "other";

export type ActivityContextType = "dm" | "community";

export type ActivitySessionPhase =
  | "idle"
  | "picking"
  | "inviting"
  | "incoming"
  | "active"
  | "ended";

export type ActivityEndResult = "win" | "lose" | "draw" | "left" | null;

export type ActivityDefinition = {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  /** emoji or short glyph for picker cards */
  icon: string;
  category: ActivityCategory;
  minPlayers: number;
  maxPlayers: number;
  /** false면 목록에만 보이고 Join 시 준비중 안내 */
  playable: boolean;
  /** 기존 미니게임 id 매핑 (선택) */
  minigameId?: string;
};

export type ActivityPlayer = {
  id: string;
  username: string;
  image?: string | null;
};

export type ActivityInvitePayload = {
  sessionId: string;
  activityId: string;
  title: string;
  contextType: ActivityContextType;
  contextId: string;
  from: ActivityPlayer;
  toUserId: string;
  /** 기존 /games 미니게임 방 코드 */
  minigameRoomId?: string | null;
};

export type ActivitySession = {
  sessionId: string;
  activityId: string;
  contextType: ActivityContextType;
  contextId: string;
  phase: ActivitySessionPhase;
  players: ActivityPlayer[];
  hostId: string;
  result: ActivityEndResult;
  /** 게임별 동기화 상태 (JSON-safe) — 틱택토 등 */
  gameState: Record<string, unknown> | null;
  /** 기존 미니게임 방 코드 */
  minigameRoomId?: string | null;
  /** host=create, guest=join */
  minigameRole?: "create" | "join" | null;
};
