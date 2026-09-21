import type { MocoDonationStatus, MocoDonationType } from "@prisma/client";

export type MocoDonationPayload = {
  id: string;
  channelId: string;
  streamerId: string;
  type: MocoDonationType;
  mocoAmount: number;
  mediaUrl: string | null;
  videoId: string | null;
  videoTitle: string | null;
  message: string | null;
  sfxKey: string | null;
  sfxSrc: string | null;
  startSec: number;
  endSec: number | null;
  playToEnd: boolean;
  segmentPlaySec: number | null;
  maxPlaySec: number;
  status: MocoDonationStatus;
  username: string;
  senderId: string;
  at: number;
};
