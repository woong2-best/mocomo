import { calcSegmentDurationSec } from "@/lib/video-donation";

export type MocoVideoDonationChannelRates = {
  rateMocoPerSec: number;
  minMoco: number;
  maxPlaySec: number;
};

export const DEFAULT_MOCO_VIDEO_DONATION_RATES: MocoVideoDonationChannelRates = {
  rateMocoPerSec: 1,
  minMoco: 2,
  maxPlaySec: 60,
};

export function calcMocoVideoDonationAmount(input: {
  startSec: number;
  endSec: number | null;
  playToEnd: boolean;
  rates: MocoVideoDonationChannelRates;
}): { segmentSec: number; mocoAmount: number } {
  const segmentSec = calcSegmentDurationSec({
    startSec: input.startSec,
    endSec: input.endSec,
    playToEnd: input.playToEnd,
    maxSec: input.rates.maxPlaySec,
  });
  const raw = segmentSec * Math.max(1, input.rates.rateMocoPerSec);
  const mocoAmount = Math.max(input.rates.minMoco, Math.ceil(raw));
  return { segmentSec, mocoAmount };
}
