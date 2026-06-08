import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { FACE_OVAL_INDICES } from "@/lib/face-filters/presets";
import type { FaceMask3dId } from "@/lib/face-filters/mask-textures";
import { FACE_TEXTURE_QUAD, getMaskTexture } from "@/lib/face-filters/mask-textures";
import { estimateHeadPose } from "@/lib/face-filters/head-pose";

type Point = { x: number; y: number };

function lm(
  result: FaceLandmarkerResult,
  index: number,
  w: number,
  h: number,
  mirrored: boolean
): Point | null {
  const p = result.faceLandmarks?.[0]?.[index];
  if (!p) return null;
  return {
    x: mirrored ? (1 - p.x) * w : p.x * w,
    y: p.y * h,
  };
}

function rotatePt(p: Point, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** 소스 삼각형 → 대상 삼각형 아핀 워핑 */
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
  const denom =
    s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denom) < 1e-6) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  const m11 =
    (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const m12 =
    (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const m21 =
    (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
  const m22 =
    (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
  const dx =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    denom;
  const dy =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
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
  mirrored: boolean,
  pad: number
) {
  const pts = FACE_OVAL_INDICES.map((i) => lm(result, i, w, h, mirrored)).filter(Boolean) as Point[];
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

/** 텍스처·얼굴 랜드마크 4점 쿼드 매핑 */
function buildFaceQuad(
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  mirrored: boolean
): [Point, Point, Point, Point] | null {
  const forehead = lm(result, 10, w, h, mirrored);
  const chin = lm(result, 152, w, h, mirrored);
  const left = lm(result, 234, w, h, mirrored);
  const right = lm(result, 454, w, h, mirrored);
  if (!forehead || !chin || !left || !right) return null;

  const faceW = Math.hypot(right.x - left.x, right.y - left.y);
  const faceH = Math.abs(chin.y - forehead.y);
  const cx = (left.x + right.x) / 2;
  const cy = (forehead.y + chin.y) / 2;
  const pose = estimateHeadPose(result, w, h, mirrored);
  const roll = pose?.roll ?? 0;

  const topY = forehead.y - faceH * 0.12;
  const bottomY = chin.y + faceH * 0.06;
  const sidePad = faceW * 0.06;

  const raw: [Point, Point, Point, Point] = [
    { x: left.x - sidePad, y: topY },
    { x: right.x + sidePad, y: topY },
    { x: right.x + sidePad * 0.5, y: bottomY },
    { x: left.x - sidePad * 0.5, y: bottomY },
  ];

  return raw.map((p) => rotatePt(p, cx, cy, roll)) as [Point, Point, Point, Point];
}

function drawWarpedMask(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  maskId: FaceMask3dId,
  mirrored: boolean
) {
  const tex = getMaskTexture(maskId);
  const dst = buildFaceQuad(result, w, h, mirrored);
  if (!dst) return;

  ctx.save();
  clipFaceOval(ctx, result, w, h, mirrored, 0.06);
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
  tick: number,
  mirrored: boolean
) {
  const pose = estimateHeadPose(result, w, h, mirrored);
  const forehead = lm(result, 10, w, h, mirrored);
  const left = lm(result, 234, w, h, mirrored);
  const right = lm(result, 454, w, h, mirrored);
  if (!forehead || !left || !right) return;

  const chin = lm(result, 152, w, h, mirrored);
  const faceH = chin ? Math.abs(chin.y - forehead.y) : w * 0.35;
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

  drawEar(left.x - earSize * 0.32, forehead.y - earSize * 0.2, false);
  drawEar(right.x + earSize * 0.32, forehead.y - earSize * 0.2, true);
}

/** 얼굴 전체 3D 마스크 — 쿼드 워핑 + 캐릭터 귀 */
export function drawFaceMask3d(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  maskId: FaceMask3dId,
  tick: number,
  mirrored = true
) {
  if (!result?.faceLandmarks?.[0]) return;

  ctx.save();
  drawMaskEars(ctx, result, w, h, maskId, tick, mirrored);
  drawWarpedMask(ctx, result, w, h, maskId, mirrored);
  ctx.restore();
}
