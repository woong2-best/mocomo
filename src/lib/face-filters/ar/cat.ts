import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { cheekPoint, eyeCenter, faceOvalPoints, lm } from "@/lib/face-filters/ar/geometry";
import {
  drawFurGrainOverlay,
  drawIrregularPatch,
  drawPhiltrumY,
} from "@/lib/face-filters/ar/canvas-utils";

const GINGER = "#E07B39";
const CREAM = "#FFF5DC";
const INNER_PINK = "#FF9EB5";
const TIP_DARK = "#5C3010";

function drawCatEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  flip: boolean,
  twitch: number
) {
  const w = height * 0.52;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(twitch * (flip ? -1 : 1));
  if (flip) ctx.scale(-1, 1);

  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.15);
  ctx.lineTo(-w * 0.55, height);
  ctx.lineTo(w * 0.55, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = TIP_DARK;
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, height * 0.55);
  ctx.lineTo(0, height * 0.08);
  ctx.lineTo(w * 0.12, height * 0.55);
  ctx.closePath();
  ctx.fill();

  const inner = ctx.createLinearGradient(0, height * 0.35, 0, height * 0.95);
  inner.addColorStop(0, INNER_PINK);
  inner.addColorStop(1, "#FFB3C8");
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.28);
  ctx.lineTo(-w * 0.28, height * 0.88);
  ctx.lineTo(w * 0.28, height * 0.88);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(90,48,16,0.25)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    const fy = height * (0.4 + i * 0.1);
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, fy);
    ctx.lineTo(w * 0.12, fy + 1.5);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.moveTo(w * 0.35, height * 0.55);
  ctx.quadraticCurveTo(w * 0.55, height * 0.75, w * 0.4, height);
  ctx.lineTo(w * 0.55, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWhiskers(
  ctx: CanvasRenderingContext2D,
  nose: { x: number; y: number },
  scale: number,
  side: "left" | "right",
  tick: number
) {
  const dir = side === "left" ? -1 : 1;
  const baseX = nose.x + dir * scale * 0.08;
  const baseY = nose.y + scale * 0.04;
  const len = scale * 0.8;
  const sway = Math.sin(tick * 0.003 + (side === "left" ? 0 : 1.5)) * scale * 0.02;

  for (let i = 0; i < 4; i++) {
    const spread = (i - 1.5) * scale * 0.045;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineCap = "round";
    ctx.lineWidth = 0.8 - i * 0.15;
    ctx.filter = "blur(0.3px)";
    ctx.beginPath();
    ctx.moveTo(baseX, baseY + spread + sway);
    ctx.quadraticCurveTo(
      baseX + dir * len * 0.5,
      baseY + spread - scale * 0.04 + sway,
      baseX + dir * len,
      baseY + spread - scale * 0.08 + sway
    );
    ctx.stroke();
    ctx.restore();
  }
}

function drawCatEyes(face: FaceArContext, ctx: CanvasRenderingContext2D) {
  for (const side of ["left", "right"] as const) {
    const eye = eyeCenter(face, side);
    const blink = side === "left" ? face.expr.blinkLeft : face.expr.blinkRight;
    const outer = lm(face.result, side === "left" ? 133 : 362, face.w, face.h, face.mirrored);
    const inner = lm(face.result, side === "left" ? 33 : 263, face.w, face.h, face.mirrored);
    if (!outer || !inner) continue;

    const dx = outer.x - inner.x;
    const dy = outer.y - inner.y;
    const len = Math.hypot(dx, dy) || 1;
    const extend = face.scale * 0.15;

    ctx.save();
    ctx.strokeStyle = "rgba(20,20,20,0.75)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(outer.x, outer.y);
    ctx.lineTo(outer.x + (dx / len) * extend, outer.y + (dy / len) * extend);
    ctx.stroke();

    ctx.fillStyle = "rgba(26,26,26,0.45)";
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, face.scale * 0.045, face.scale * 0.11 * (1 - blink * 0.85), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(eye.x - face.scale * 0.02, eye.y - face.scale * 0.03, face.scale * 0.055, -0.8, 0.4);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCalicoPatches(face: FaceArContext, ctx: CanvasRenderingContext2D) {
  drawIrregularPatch(
    ctx,
    face.forehead.x - face.faceW * 0.08,
    face.forehead.y + face.scale * 0.08,
    face.scale * 0.22,
    face.scale * 0.16,
    GINGER,
    0.35,
    0.5
  );
  drawIrregularPatch(
    ctx,
    cheekPoint(face, "left").x,
    cheekPoint(face, "left").y,
    face.scale * 0.2,
    face.scale * 0.14,
    GINGER,
    0.32,
    1.1
  );
  drawIrregularPatch(
    ctx,
    cheekPoint(face, "right").x,
    cheekPoint(face, "right").y,
    face.scale * 0.18,
    face.scale * 0.13,
    GINGER,
    0.3,
    2.2
  );
}

/** Calico cat AR — SLEEK · MYSTERIOUS */
export function drawCatOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const earH = Math.min(face.scale * 1.15, face.h * 0.12);
  const twitchL = Math.sin(face.tick * 0.0025 + 0.3) * 0.06;
  const twitchR = Math.sin(face.tick * 0.0025 + 1.8) * 0.06;

  drawCatEar(ctx, face.leftTemple.x - face.scale * 0.08, face.forehead.y - earH * 0.35, earH, false, twitchL);
  drawCatEar(ctx, face.rightTemple.x + face.scale * 0.08, face.forehead.y - earH * 0.35, earH, true, twitchR);

  drawFurGrainOverlay(ctx, faceOvalPoints(face), face.w, face.h, CREAM, 0.12, 1.1, face.tick);
  drawCalicoPatches(face, ctx);

  const noseW = face.scale * 0.1;
  const noseH = face.scale * 0.08;
  ctx.fillStyle = INNER_PINK;
  ctx.beginPath();
  ctx.moveTo(face.nose.x, face.nose.y + noseH * 0.35);
  ctx.lineTo(face.nose.x - noseW * 0.5, face.nose.y - noseH * 0.2);
  ctx.lineTo(face.nose.x + noseW * 0.5, face.nose.y - noseH * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(face.nose.x, face.nose.y - noseH * 0.05, face.scale * 0.012, 0, Math.PI * 2);
  ctx.fill();
  drawPhiltrumY(ctx, face.nose, face.scale, "rgba(255,158,181,0.7)", 0.7);

  drawWhiskers(ctx, face.nose, face.scale, "left", face.tick);
  drawWhiskers(ctx, face.nose, face.scale, "right", face.tick);
  drawCatEyes(face, ctx);
}
