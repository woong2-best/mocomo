import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { FaceFilterPreset } from "@/lib/face-filters/presets";
import { buildFaceArContext } from "@/lib/face-filters/ar/geometry";
import { drawDogOverlay } from "@/lib/face-filters/ar/dog";
import { drawCatOverlay } from "@/lib/face-filters/ar/cat";
import { drawBunnyOverlay } from "@/lib/face-filters/ar/bunny";
import { drawCrownOverlay } from "@/lib/face-filters/ar/crown";
import { drawGlassesOverlay } from "@/lib/face-filters/ar/glasses";
import { drawHeartsOverlay } from "@/lib/face-filters/ar/hearts";

export function drawPremiumArOverlay(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  overlay: NonNullable<FaceFilterPreset["overlay"]>,
  tick: number,
  mirrored: boolean
) {
  const face = buildFaceArContext(result, w, h, tick, mirrored);
  if (!face) return;

  switch (overlay) {
    case "dog":
      drawDogOverlay(ctx, face);
      break;
    case "cat":
      drawCatOverlay(ctx, face);
      break;
    case "bunny":
      drawBunnyOverlay(ctx, face);
      break;
    case "crown":
      drawCrownOverlay(ctx, face);
      break;
    case "glasses":
      drawGlassesOverlay(ctx, face);
      break;
    case "hearts":
      drawHeartsOverlay(ctx, face);
      break;
  }
}
