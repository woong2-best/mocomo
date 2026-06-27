import type { IsoCameraPreset } from "./types";

/** Reference-style isometric orthographic camera (30° elevation, ~45° azimuth) */
export const ISO_CAMERA_APT: IsoCameraPreset = {
  position: [7.2, 8.4, 7.2],
  zoom: 68,
  target: [0, 0.4, 0],
};

export const ISO_CAMERA_ROOM: IsoCameraPreset = {
  position: [5.5, 6.8, 5.5],
  zoom: 92,
  target: [0, 0.35, 0],
};

export function scaledZoom(base: number, userZoom: number) {
  return base * userZoom;
}
