import type { Pt } from "@/lib/face-filters/ar/geometry";

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function polygonClip(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
}

/** 3D 볼륨 하트 */
export function drawHeart3d(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fillTop: string,
  fillBottom: string,
  alpha = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  const s = size / 24;
  ctx.scale(s, s);

  const g = ctx.createLinearGradient(-12, -14, 12, 14);
  g.addColorStop(0, fillTop);
  g.addColorStop(1, fillBottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-14, -6, -8, -18, 0, -10);
  ctx.bezierCurveTo(8, -18, 14, -6, 0, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(-5, -8, 3.5, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(120,0,40,0.25)";
  ctx.beginPath();
  ctx.ellipse(4, 4, 3, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = fillBottom;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
}

export function drawStarSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 0.8;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * len * 0.2, y + Math.sin(a) * len * 0.2);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSoftBlush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  hex: string,
  opacity: number
) {
  const r = parseInt(hex.slice(1, 3), 16);
  const gC = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  ctx.save();
  ctx.filter = `blur(${Math.max(8, radius * 0.44)}px)`;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(${r},${gC},${b},${opacity})`);
  grad.addColorStop(0.55, `rgba(${r},${gC},${b},${opacity * 0.35})`);
  grad.addColorStop(1, `rgba(${r},${gC},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawFacetedGem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  baseColor: string,
  tick: number,
  facetIndex: number
) {
  ctx.save();
  ctx.translate(x, y);
  const shimmer = 0.35 + 0.35 * Math.sin(tick * 0.004 + facetIndex * 1.7);
  ctx.rotate(tick * 0.0003 + facetIndex);

  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r * 1.2);
  g.addColorStop(0, lighten(baseColor, 0.45));
  g.addColorStop(0.45, baseColor);
  g.addColorStop(1, darken(baseColor, 0.35));
  ctx.fillStyle = g;

  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = shimmer;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 0.55);
  ctx.lineTo(r * 0.05, -r * 0.35);
  ctx.lineTo(-r * 0.05, -r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255, r + 255 * amt)},${Math.min(255, g + 255 * amt)},${Math.min(255, b + 255 * amt)})`;
}

function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r * (1 - amt)},${g * (1 - amt)},${b * (1 - amt)})`;
}

/** 피부 위 fur grain 오버레이 */
export function drawFurGrainOverlay(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  w: number,
  h: number,
  tint: string,
  opacity: number,
  frequency: number,
  tick: number
) {
  if (pts.length < 8) return;
  ctx.save();
  polygonClip(ctx, pts);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = opacity;
  const { r, g, b } = hexToRgb(tint);
  const seed = Math.floor(tick / 80);
  for (let i = 0; i < Math.floor(w * h * frequency * 0.00008); i++) {
    const px = ((i * 7919 + seed * 13) % 1000) / 1000;
    const py = ((i * 6271 + seed * 17) % 1000) / 1000;
    const x = px * w;
    const y = py * h;
    const len = 1.5 + (i % 3);
    const ang = ((i * 31) % 180) * (Math.PI / 180);
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.15 + (i % 5) * 0.04})`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawIrregularPatch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  opacity: number,
  seed: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.filter = "blur(12px)";
  ctx.beginPath();
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 0.75 + 0.35 * Math.sin(a * 3 + seed);
    const px = cx + Math.cos(a) * rx * wobble;
    const py = cy + Math.sin(a) * ry * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPhiltrumY(
  ctx: CanvasRenderingContext2D,
  nose: Pt,
  scale: number,
  color: string,
  width: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(nose.x, nose.y + scale * 0.04);
  ctx.lineTo(nose.x, nose.y + scale * 0.12);
  ctx.moveTo(nose.x - scale * 0.04, nose.y + scale * 0.12);
  ctx.lineTo(nose.x, nose.y + scale * 0.155);
  ctx.lineTo(nose.x + scale * 0.04, nose.y + scale * 0.12);
  ctx.stroke();
  ctx.restore();
}

/** 반투명 3D 버블 구체 */
export function drawBubbleSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: string,
  alpha = 0.75,
  tick = 0
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,0.95)`);
  g.addColorStop(0.25, `${hue}88`);
  g.addColorStop(0.65, `${hue}44`);
  g.addColorStop(1, `${hue}11`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(0.8, r * 0.06);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  const shimmer = 0.5 + 0.5 * Math.sin(tick * 0.005);
  ctx.fillStyle = `rgba(255,255,255,${0.7 * shimmer})`;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.32, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 홀로그램 스타 별 */
export function drawIridescentStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tick: number,
  alpha = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tick * 0.002);
  ctx.globalAlpha = alpha;

  const colors = ["#FFB6E1", "#E1B6FF", "#B6E1FF", "#FFD6B6"];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const outer = size;
    const inner = size * 0.42;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const ang = a + (j * Math.PI) / 5;
      const rr = j % 2 === 0 ? outer : inner;
      const px = Math.cos(ang) * rr;
      const py = Math.sin(ang) * rr;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fill();
  }

  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(-size * 0.15, -size * 0.15, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
