import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint } from "@/lib/face-filters/ar/geometry";
import {
  drawBubbleSphere,
  drawIridescentStar,
  drawSoftBlush,
} from "@/lib/face-filters/ar/canvas-utils";

/** Bubbles ☆ — 버블 + 홀로 스타 */
export function drawBubblesStarOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const cx = (face.leftTemple.x + face.rightTemple.x) / 2;
  const cy = (face.forehead.y + face.chin.y) / 2;
  const t = face.tick;

  const bubbles = [
    { x: cx, y: cy - face.scale * 0.95, r: face.scale * 0.28 },
    { x: cx - face.faceW * 0.45, y: cy - face.scale * 0.3, r: face.scale * 0.2 },
    { x: cx + face.faceW * 0.42, y: cy - face.scale * 0.15, r: face.scale * 0.22 },
    { x: cx - face.faceW * 0.25, y: cy + face.scale * 0.55, r: face.scale * 0.16 },
    { x: cx + face.faceW * 0.3, y: cy + face.scale * 0.5, r: face.scale * 0.18 },
  ];

  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    const wobble = Math.sin(t * 0.003 + i * 1.2) * face.scale * 0.06;
    drawBubbleSphere(ctx, b.x + wobble, b.y + wobble * 0.5, b.r, "#E1B6FF", 0.7, t);
    drawIridescentStar(ctx, b.x + wobble, b.y + wobble * 0.5, b.r * 0.38, t, 0.88);
  }

  for (const side of ["left", "right"] as const) {
    const cheek = cheekPoint(face, side);
    drawIridescentStar(ctx, cheek.x, cheek.y - face.scale * 0.05, face.scale * 0.12, t, 0.92);
    drawSoftBlush(ctx, cheek.x, cheek.y + face.scale * 0.05, face.scale * 0.38, "#FFD6E8", 0.45);
  }
}
