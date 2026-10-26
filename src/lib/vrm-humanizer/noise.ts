import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

export type ContinuousNoise = {
  /** Signed Simplex sample in roughly [-1, 1]. */
  signed: (time: number, channel: number) => number;
  /** Remapped to [0, 1] for intervals and chances. */
  unit: (time: number, channel: number) => number;
};

export function createContinuousNoise(random: () => number = Math.random): ContinuousNoise {
  const noise2D: NoiseFunction2D = createNoise2D(random);
  return {
    signed(time, channel) {
      return noise2D(time, channel);
    },
    unit(time, channel) {
      return 0.5 + 0.5 * noise2D(time, channel);
    },
  };
}
