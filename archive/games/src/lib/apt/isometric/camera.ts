import type { IsoCameraPreset } from "./types";

/** Reference-style isometric orthographic camera (30° elevation, ~45° azimuth) */
export const ISO_CAMERA_APT: IsoCameraPreset = {
  position: [7.2, 8.4, 7.2],
  frustum: 5.4,
  target: [0, 0.4, 0],
};

export const ISO_CAMERA_ROOM: IsoCameraPreset = {
  position: [5.5, 6.8, 5.5],
  frustum: 2.65,
  target: [0, 0.35, 0],
};

/** Premium dollhouse overview — tighter framing, reference isometric angle */
export const DOLLHOUSE_CAMERA: IsoCameraPreset = {
  position: [6.4, 7.6, 6.4],
  frustum: 4.25,
  target: [-0.2, 0.28, 0],
};

/** User pinch/zoom — smaller frustum = closer view */
export function scaledFrustum(base: number, userZoom: number) {
  return base / userZoom;
}
