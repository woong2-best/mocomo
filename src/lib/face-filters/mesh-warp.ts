import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { FACE_OVAL_INDICES } from "@/lib/face-filters/presets";
import type { FaceMask3dId } from "@/lib/face-filters/mask-textures";
import { FACE_TEXTURE_QUAD, getMaskTexture } from "@/lib/face-filters/mask-textures";
import { estimateHeadPose } from "@/lib/face-filters/head-pose";
import { faceVerticalSpan, landmarkPt } from "@/lib/face-filters/face-coords";

type Point = { x: number; y: number };

function lm(result: FaceLandmarkerResult, index: number, w: number, h: number): Point | null {
  return landmarkPt(result, index, w, h);
}

function triArea(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}

function rotatePt(p: Point, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** 소스 삼각형 → 대상 삼각형 아핀 워핑 (반사 방지) */
function warpTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point
) {
  const ss0 = s0;
  const ss1 = s1;
  const ss2 = s2;
  const dd0 = d0;
  let dd1 = d1;
  let dd2 = d2;

  if (triArea(ss0, ss1, ss2) * triArea(dd0, dd1, dd2) < 0) {
    dd1 = d2;
    dd2 = d1;
  }

  const denom =
    ss0.x * (ss1.y - ss2.y) + ss1.x * (ss2.y - ss0.y) + ss2.x * (ss0.y - ss1.y);
  if (Math.abs(denom) < 1e-6) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dd0.x, dd0.y);
  ctx.lineTo(dd1.x, dd1.y);
  ctx.lineTo(dd2.x, dd2.y);
  ctx.closePath();
  ctx.clip();

  const m11 =
    (dd0.x * (ss1.y - ss2.y) + dd1.x * (ss2.y - ss0.y) + dd2.x * (ss0.y - ss1.y)) / denom;
  const m12 =
    (dd0.y * (ss1.y - ss2.y) + dd1.y * (ss2.y - ss0.y) + dd2.y * (ss0.y - ss1.y)) / denom;
  const m21 =
    (dd0.x * (ss2.x - ss1.x) + dd1.x * (ss0.x - ss2.x) + dd2.x * (ss1.x - ss0.x)) / denom;
  const m22 =
    (dd0.y * (ss2.x - ss1.x) + dd1.y * (ss0.x - ss2.x) + dd2.y * (ss1.x - ss0.x)) / denom;
  const dx =
    (dd0.x * (ss1.x * ss2.y - ss2.x * ss1.y) +
      dd1.x * (ss2.x * ss0.y - ss0.x * ss2.y) +
      dd2.x * (ss0.x * ss1.y - ss1.x * ss0.y)) /
    denom;
  const dy =
    (dd0.y * (ss1.x * ss2.y - ss2.x * ss1.y) +
      dd1.y * (ss2.x * ss0.y - ss0.x * ss2.y) +
      dd2.y * (ss0.x * ss1.y - ss1.x * ss0.y)) /
    denom;

  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(img, 0, 0, imgW, imgH);
  ctx.restore();
}

function warpQuad(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  src: [Point, Point, Point, Point],
  dst: [Point, Point, Point, Point]
) {
  const [s0, s1, s2, s3] = src;
  const [d0, d1, d2, d3] = dst;
  const iw = img.width;
  const ih = img.height;
  warpTriangle(ctx, img, iw, ih, s0, s1, s3, d0, d1, d3);
  warpTriangle(ctx, img, iw, ih, s1, s2, s3, d1, d2, d3);
}

function clipFaceOval(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  pad: number
) {
  const pts = FACE_OVAL_INDICES.map((i) => lm(result, i, w, h)).filter(Boolean) as Point[];
  if (pts.length < 8) return false;

  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  cx /= pts.length;
  cy /= pts.length;

  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dx = p.x - cx;
    const dy = p.y - cy;
    const px = cx + dx * (1 + pad);
    const py = cy + dy * (1 + pad);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.clip();
  return true;
}

function buildFaceQuad(
  result: FaceLandmarkerResult,
  w: number,
  h: number
): [Point, Point, Point, Point] | null {
  const forehead = lm(result, 10, w, h);
  const chin = lm(result, 152, w, h);
  const left = lm(result, 234, w, h);
  const right = lm(result, 454, w, h);
  if (!forehead || !chin || !left || !right) return null;

  const faceW = Math.hypot(right.x - left.x, right.y - left.y);
  const span = faceVerticalSpan(forehead, chin);
  const cx = (left.x + right.x) / 2;
  const cy = (span.top + span.bottom) / 2;
  const pose = estimateHeadPose(result, w, h);
  const roll = pose?.roll ?? 0;

  const topY = span.top - span.height * 0.12;
  const bottomY = span.bottom + span.height * 0.06;
  const sidePad = faceW * 0.06;

  const leftX = Math.min(left.x, right.x) - sidePad;
  const rightX = Math.max(left.x, right.x) + sidePad;

  const raw: [Point, Point, Point, Point] = [
    { x: leftX, y: topY },
    { x: rightX, y: topY },
    { x: rightX - sidePad * 0.5, y: bottomY },
    { x: leftX + sidePad * 0.5, y: bottomY },
  ];

  return raw.map((p) => rotatePt(p, cx, cy, roll)) as [Point, Point, Point, Point];
}

function drawWarpedMask(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  maskId: FaceMask3dId
) {
  const tex = getMaskTexture(maskId);
  const dst = buildFaceQuad(result, w, h);
  if (!dst) return;

  ctx.save();
  clipFaceOval(ctx, result, w, h, 0.06);
  ctx.globalAlpha = 0.96;
  warpQuad(ctx, tex, FACE_TEXTURE_QUAD, dst);
  ctx.restore();
}

function drawMaskEars(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  maskId: FaceMask3dId,
  tick: number
) {
  const pose = estimateHeadPose(result, w, h);
  const forehead = lm(result, 10, w, h);
  const left = lm(result, 234, w, h);
  const right = lm(result, 454, w, h);
  const chin = lm(result, 152, w, h);
  if (!forehead || !left || !right) return;

  const span = chin ? faceVerticalSpan(forehead, chin) : { top: forehead.y, height: w * 0.35 };
  const faceH = span.height;
  const topY = span.top;
  const earSize = faceH * 0.38;
  const wobble = Math.sin(tick * 0.006) * earSize * 0.04;
  const roll = pose?.roll ?? 0;
  const yaw = pose?.yaw ?? 0;

  const styles: Record<
    FaceMask3dId,
    { fill: string; inner: string; type: "flop" | "tri" | "round" | "tuft" | "fox" }
  > = {
    "dog-face": { fill: "#c49a6c", inner: "#ffb3ba", type: "flop" },
    "cat-face": { fill: "#b0bec5", inner: "#f48fb1", type: "tri" },
    "bear-face": { fill: "#8d6e63", inner: "#6d4c41", type: "round" },
    "clown-face": { fill: "#42a5f5", inner: "#90caf9", type: "tuft" },
    "fox-face": { fill: "#e65100", inner: "#fff3e0", type: "fox" },
  };
  const style = styles[maskId];

  const drawEar = (x: number, y: number, flip: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(roll + (flip ? -0.12 : 0.12) + yaw * (flip ? 0.3 : -0.3));
    if (flip) ctx.scale(-1, 1);

    if (style.type === "flop") {
      ctx.fillStyle = style.fill;
      ctx.beginPath();
      ctx.moveTo(0, wobble);
      ctx.bezierCurveTo(-earSize * 0.55, -earSize * 0.1, -earSize * 0.5, earSize * 0.75, -earSize * 0.2, earSize * 0.95);
      ctx.bezierCurveTo(earSize * 0.05, earSize * 0.7, earSize * 0.05, earSize * 0.1, 0, wobble);
      ctx.fill();
      ctx.fillStyle = style.inner;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(-earSize * 0.18, earSize * 0.35, earSize * 0.12, earSize * 0.28, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (style.type === "tri") {
      ctx.fillStyle = style.fill;
      ctx.beginPath();
      ctx.moveTo(0, -earSize * 0.05);
      ctx.lineTo(-earSize * 0.42, earSize * 0.85);
      ctx.lineTo(earSize * 0.42, earSize * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = style.inner;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, earSize * 0.05);
      ctx.lineTo(-earSize * 0.2, earSize * 0.65);
      ctx.lineTo(earSize * 0.2, earSize * 0.65);
      ctx.closePath();
      ctx.fill();
    } else if (style.type === "fox") {
      ctx.fillStyle = style.fill;
      ctx.beginPath();
      ctx.moveTo(0, -earSize * 0.15);
      ctx.lineTo(-earSize * 0.38, earSize * 0.95);
      ctx.lineTo(earSize * 0.05, earSize * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -earSize * 0.15);
      ctx.lineTo(earSize * 0.38, earSize * 0.95);
      ctx.lineTo(-earSize * 0.05, earSize * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = style.inner;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, earSize * 0.05);
      ctx.lineTo(-earSize * 0.14, earSize * 0.55);
      ctx.lineTo(earSize * 0.14, earSize * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (style.type === "tuft") {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 1 ? style.inner : style.fill;
        ctx.beginPath();
        ctx.arc((i - 1) * earSize * 0.22, wobble + i * 3, earSize * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = style.fill;
      ctx.beginPath();
      ctx.ellipse(0, wobble, earSize * 0.35, earSize * 0.42, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = style.inner;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, wobble * 0.5, earSize * 0.16, earSize * 0.22, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const leftX = Math.min(left.x, right.x);
  const rightX = Math.max(left.x, right.x);
  drawEar(leftX - earSize * 0.32, topY - earSize * 0.2, false);
  drawEar(rightX + earSize * 0.32, topY - earSize * 0.2, true);
}

/** 얼굴 전체 3D 마스크 — 쿼드 워핑 + 캐릭터 귀 */
export function drawFaceMask3d(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  maskId: FaceMask3dId,
  tick: number
) {
  if (!result?.faceLandmarks?.[0]) return;

  ctx.save();
  drawMaskEars(ctx, result, w, h, maskId, tick);
  drawWarpedMask(ctx, result, w, h, maskId);
  ctx.restore();
}
