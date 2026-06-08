import type { FaceArContext } from "@/lib/face-filters/ar/geometry";
import { drawFacetedGem } from "@/lib/face-filters/ar/canvas-utils";

const GEM_COLORS = ["#C0392B", "#1B8A4A", "#1B8A4A", "#2471A3", "#2471A3"];
const SPIRE_HEIGHTS = [0.75, 0.6, 0.9, 0.6, 0.75];

/** Gothic jeweled crown — REGAL · METALLIC */
export function drawCrownOverlay(ctx: CanvasRenderingContext2D, face: FaceArContext) {
  const cx = (face.leftTemple.x + face.rightTemple.x) / 2;
  const floatY = Math.sin(face.tick * 0.00314) * face.scale * 0.03;
  const cy = face.forehead.y - face.scale * 0.55 + floatY;
  const bandW = face.faceW * 0.95;
  const bandH = face.scale * 0.22;
  const roll = face.pose?.roll ?? 0;
  const yaw = face.pose?.yaw ?? 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(roll * 0.35);
  ctx.scale(1 - Math.abs(yaw) * 0.12, 1);

  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 6;

  const crownW = bandW * 0.55;
  const baseY = bandH * 0.35;
  const shimmer = 0.5 + 0.5 * Math.sin(face.tick * 0.0021);

  ctx.beginPath();
  ctx.moveTo(-crownW, baseY);
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const x = -crownW + t * crownW * 2;
    const peakY = baseY - face.scale * SPIRE_HEIGHTS[i];
    const midX = x + crownW / 4;
    if (i === 0) ctx.lineTo(x, peakY);
    else {
      const prevT = (i - 1) / 4;
      const prevX = -crownW + prevT * crownW * 2;
      const valleyX = (prevX + x) / 2;
      ctx.lineTo(valleyX, baseY - face.scale * 0.08);
      ctx.lineTo(x, peakY);
    }
    if (i < 4) ctx.lineTo(midX, baseY - face.scale * (SPIRE_HEIGHTS[i] + SPIRE_HEIGHTS[i + 1]) * 0.35);
  }
  ctx.lineTo(crownW, baseY);
  ctx.lineTo(crownW, baseY + bandH);
  ctx.lineTo(-crownW, baseY + bandH);
  ctx.closePath();

  const metal = ctx.createLinearGradient(-crownW, -face.scale, crownW, bandH);
  metal.addColorStop(0, "#FFF5A0");
  metal.addColorStop(0.35, "#FFD700");
  metal.addColorStop(0.65, "#FFA500");
  metal.addColorStop(1, "#7A5500");
  ctx.fillStyle = metal;
  ctx.fill();

  ctx.strokeStyle = `rgba(255,245,160,${0.35 + shimmer * 0.35})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const x = -crownW + t * crownW * 2;
    const peakY = baseY - face.scale * SPIRE_HEIGHTS[i];
    drawFacetedGem(ctx, x, peakY - face.scale * 0.08, face.scale * 0.14, GEM_COLORS[i], face.tick, i);
  }

  const pearlCount = Math.floor(bandW / (face.scale * 0.18));
  for (let i = 0; i < pearlCount; i++) {
    const px = -crownW + (i + 0.5) * ((crownW * 2) / pearlCount);
    const py = baseY + bandH * 0.55;
    const pg = ctx.createRadialGradient(px - 2, py - 2, 0, px, py, face.scale * 0.035);
    pg.addColorStop(0, "#FFFFFF");
    pg.addColorStop(0.45, "#FAF5E4");
    pg.addColorStop(1, "#D4C4A8");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, face.scale * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
