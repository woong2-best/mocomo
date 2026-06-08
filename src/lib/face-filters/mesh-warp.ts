import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { FACE_OVAL_INDICES } from "@/lib/face-filters/presets";
import type { FaceMask3dId } from "@/lib/face-filters/mask-textures";
import { getMaskTexture, getMaskTemplatePoint } from "@/lib/face-filters/mask-textures";
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
  const x = mirrored ? (1 - p.x) * w : p.x * w;
  return { x, y: p.y * h };
}

/** 삼각형 단위 아핀 워핑 — 인스타/Snap 스타일 얼굴 밀착 마스크 */
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
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  const denom =
    s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denom) < 1e-8) {
    ctx.restore();
    return;
  }

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

function drawWarpedMask(
  ctx: CanvasRenderingContext2D,
  result: FaceLandmarkerResult,
  w: number,
  h: number,
  maskId: FaceMask3dId,
  mirrored: boolean
) {
  const tex = getMaskTexture(maskId);
  const tw = tex.width;
  const th = tex.height;
  const nose = lm(result, 1, w, h, mirrored);
  if (!nose) return;

  const oval = FACE_OVAL_INDICES.map((i) => lm(result, i, w, h, mirrored)).filter(Boolean) as Point[];
  if (oval.length < 12) return;

  const tpl = (i: number) => {
    const p = getMaskTemplatePoint(i);
    return { x: p.u * tw, y: p.v * th };
  };

  const noseTpl = tpl(1);
  const noseDst = nose;

  for (let i = 0; i < oval.length; i++) {
    const i0 = FACE_OVAL_INDICES[i];
    const i1 = FACE_OVAL_INDICES[(i + 1) % oval.length];
    const dst0 = oval[i];
    const dst1 = oval[(i + 1) % oval.length];
    const src0 = tpl(i0);
    const src1 = tpl(i1);
    warpTriangle(ctx, tex, tw, th, noseTpl, src0, src1, noseDst, dst0, dst1);
  }

  const innerIndices = [33, 133, 362, 263, 61, 291, 199, 4];
  for (const idx of innerIndices) {
    const dst = lm(result, idx, w, h, mirrored);
    if (!dst) continue;
    const src = tpl(idx);
    const mid = {
      x: (noseDst.x + dst.x) / 2,
      y: (noseDst.y + dst.y) / 2,
    };
    const midTpl = {
      x: (noseTpl.x + src.x) / 2,
      y: (noseTpl.y + src.y) / 2,
    };
    warpTriangle(ctx, tex, tw, th, noseTpl, midTpl, src, noseDst, mid, dst);
  }
}

function drawPoseEars(
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
  if (!pose || !forehead) return;

  const chinPt = lm(result, 152, w, h, mirrored);
  const faceH = chinPt
    ? Math.abs(chinPt.y - forehead.y)
    : w * 0.35;
  const earSize = faceH * 0.42;
  const wobble = Math.sin(tick * 0.006) * earSize * 0.04;

  const palette: Record<FaceMask3dId, { fill: string; inner: string }> = {
    "dog-face": { fill: "#c49a6c", inner: "#a67c52" },
    "cat-face": { fill: "#9aa0a6", inner: "#f48fb1" },
    "bear-face": { fill: "#8d6e63", inner: "#6d4c41" },
    "clown-face": { fill: "#ff7043", inner: "#ffab91" },
    "fox-face": { fill: "#e65100", inner: "#ffcc80" },
  };
  const colors = palette[maskId];

  const drawEar = (x: number, y: number, flip: boolean, depth: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pose.roll + (flip ? -0.15 : 0.15) + pose.yaw * (flip ? 0.35 : -0.35));
    const squash = 1 - Math.abs(pose.yaw) * 0.35 * (flip ? 1 : 1);
    ctx.scale(flip ? -squash : squash, 1 + depth * 0.15);
    ctx.fillStyle = colors.fill;
    ctx.beginPath();
    ctx.ellipse(0, wobble, earSize * 0.38, earSize * 0.72, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.inner;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(0, wobble * 0.5, earSize * 0.18, earSize * 0.38, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (left) drawEar(left.x - earSize * 0.35, forehead.y - earSize * 0.35, false, pose.yaw);
  if (right) drawEar(right.x + earSize * 0.35, forehead.y - earSize * 0.35, true, pose.yaw);
}

/** 얼굴 전체 3D 마스크 — 메시 워핑 + 입체 귀 */
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
  ctx.globalCompositeOperation = "source-over";
  drawPoseEars(ctx, result, w, h, maskId, tick, mirrored);
  drawWarpedMask(ctx, result, w, h, maskId, mirrored);
  ctx.restore();
}
