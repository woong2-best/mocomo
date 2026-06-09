import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint } from "@/lib/face-filters/ar/geometry";
import {
  drawBubbleSphere,
  drawHeart3d,
  drawIridescentStar,
  drawSoftBlush,
} from "@/lib/face-filters/ar/canvas-utils";
import { resetHeartParticles, updateHeartParticles } from "@/lib/face-filters/ar/particles";

let lastKey = "";

function ensureParticles(face: FaceArContext) {
  const key = `${face.w}x${face.h}`;
  if (key !== lastKey) {
    resetHeartParticles();
    lastKey = key;
  }
}

/** Bubble hearts — 반투명 버블 + 하트/별 */
export function drawBubbleHeartsOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  ensureParticles(face);
  const cx = (face.leftTemple.x + face.rightTemple.x) / 2;
  const cy = (face.forehead.y + face.chin.y) / 2;
  const t = face.tick;

  const floats = [
    { x: cx - face.faceW * 0.55, y: cy - face.scale * 0.8, r: face.scale * 0.22, drift: 0.003 },
    { x: cx + face.faceW * 0.5, y: cy - face.scale * 0.5, r: face.scale * 0.18, drift: 0.004 },
    { x: cx - face.faceW * 0.35, y: cy + face.scale * 0.6, r: face.scale * 0.15, drift: 0.0025 },
    { x: cx + face.faceW * 0.4, y: cy + face.scale * 0.45, r: face.scale * 0.2, drift: 0.0035 },
  ];

  for (const b of floats) {
    const bx = b.x + Math.sin(t * b.drift) * face.scale * 0.08;
    const by = b.y + Math.cos(t * b.drift * 0.8) * face.scale * 0.06;
    drawBubbleSphere(ctx, bx, by, b.r, "#FF69B4", 0.72, t);
    drawHeart3d(ctx, bx, by + b.r * 0.05, b.r * 0.55, "#FF1493", "#C2185B", 0.88);
    if (Math.sin(t * 0.006 + b.drift * 100) > 0.5) {
      drawIridescentStar(ctx, bx, by - b.r * 0.35, b.r * 0.25, t, 0.75);
    }
  }

  for (const side of ["left", "right"] as const) {
    const cheek = cheekPoint(face, side);
    const pulse = 1 + Math.sin(t * 0.007 + (side === "left" ? 0 : 1.5)) * 0.12;
    drawBubbleSphere(ctx, cheek.x, cheek.y, face.scale * 0.14 * pulse, "#FF80AB", 0.65, t);
    drawHeart3d(ctx, cheek.x, cheek.y, face.scale * 0.1 * pulse, "#FF1493", "#E91E63", 0.9);
  }

  drawSoftBlush(ctx, cheekPoint(face, "left").x, cheekPoint(face, "left").y, face.scale * 0.42, "#FFB6C1", 0.5);
  drawSoftBlush(ctx, cheekPoint(face, "right").x, cheekPoint(face, "right").y, face.scale * 0.42, "#FFB6C1", 0.5);

  const parts = updateHeartParticles(face.w, face.h, cx, cy - face.scale * 0.2, t);
  for (const p of parts) {
    const fade = 1 - (t - p.born) / p.life;
    drawBubbleSphere(ctx, p.x, p.y, p.size * 0.85, "#FF69B4", fade * 0.6, t);
    drawHeart3d(ctx, p.x, p.y, p.size * 0.45, "#FF1493", "#C2185B", fade * 0.8);
  }
}
