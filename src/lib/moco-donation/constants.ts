import type { MocoDonationType } from "@prisma/client";

/** OBS 위젯에서 재생할 영상 최대 길이(초) — abuse 방지 */
export const MOCO_DONATION_DEFAULT_MAX_PLAY_SEC = 60;

export const MOCO_DONATION_MAX_PLAY_SEC_CAP = 120;

export const MOCO_DONATION_MIN_AMOUNT: Partial<Record<MocoDonationType, number>> & {
  SFX: number;
  CHAT: number;
  VIDEO: number;
} = {
  VIDEO: 1,
  SFX: 1,
  CHAT: 1,
};

export const MOCO_DONATION_MAX_AMOUNT = 10_000;
