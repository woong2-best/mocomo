/** 다이orama 화면 좌표 — 900×680 viewBox 기준 */
export const VB = { w: 900, h: 680 };

/** 그리드 gx/gz → 바닥 위 SVG 좌표 (입체 원근) */
export function gridToSvg(gx: number, gz: number) {
  const x = 450 + (gx - gz) * 58;
  const y = 418 + (gx + gz) * 30;
  return { x, y };
}

export function gridZ(gx: number, gz: number) {
  return 10 + Math.round((gx + gz) * 3 + (gx + 3) * 2);
}
