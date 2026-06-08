import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint, eyeCenter } from "@/lib/face-filters/ar/geometry";
import {
  drawHeart3d,
  drawSoftBlush,
  drawStarSparkle,
} from "@/lib/face-filters/ar/canvas-utils";
import { resetHeartParticles, updateHeartParticles } from "@/lib/face-filters/ar/particles";

let lastFilterKey = "";

function ensureParticles(face: FaceArContext) {
  const key = `${face.w}x${face.h}`;
  if (key !== lastFilterKey) {
    resetHeartParticles();
    lastFilterKey = key;
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  const pulse = 0.08 + Math.sin(tick * 0.0021) * 0.02;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(255,105,180,0)");
  g.addColorStop(1, `rgba(255,105,180,${pulse})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Romantic heart particle filter — ROMANTIC · DREAMY */
export function drawHeartsOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  ensureParticles(face);
  drawVignette(ctx, face.w, face.h, face.tick);

  const pulse = 1 + Math.sin(face.tick * 0.00628) * 0.18;
  const cx = (face.leftTemple.x + face.rightTemple.x) / 2;
  const cy = (face.forehead.y + face.chin.y) / 2;

  for (const side of ["left", "right"] as const) {
    const eye = eyeCenter(face, side);
    drawHeart3d(ctx, eye.x, eye.y, face.scale * 0.3 * pulse, "#C2185B", "#FF69B4", 0.92);
    if (Math.sin(face.tick * 0.01 + (side === "left" ? 0 : 2)) > 0.6) {
      drawStarSparkle(ctx, eye.x, eye.y - face.scale * 0.08, face.scale * 0.08, 0.85);
    }
  }

  const cheekBreath = 0.55 + Math.sin(face.tick * 0.004) * 0.1;
  for (const side of ["left", "right"] as const) {
    const cheek = cheekPoint(face, side);
    drawSoftBlush(ctx, cheek.x, cheek.y, face.scale * 0.38, "#FFCDD2", 0.45);
    drawHeart3d(ctx, cheek.x - face.scale * 0.12, cheek.y - face.scale * 0.05, face.scale * 0.18, "#C2185B", "#FF1493", 0.65 * cheekBreath);
    drawHeart3d(ctx, cheek.x + face.scale * 0.1, cheek.y + face.scale * 0.02, face.scale * 0.14, "#FF69B4", "#FF1493", 0.55 * cheekBreath);
  }

  const parts = updateHeartParticles(face.w, face.h, cx, cy, face.tick);
  for (const p of parts) {
    const age = face.tick - p.born;
    const fade = 1 - age / p.life;
    drawHeart3d(ctx, p.x, p.y, p.size, "#C2185B", "#FF69B4", fade * 0.85);
    if (Math.sin(face.tick * 0.015 + p.wiggle) > 0.65) {
      drawStarSparkle(ctx, p.x, p.y - p.size * 0.2, p.size * 0.35, fade * 0.7);
    }
  }
}
