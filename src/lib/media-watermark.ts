/** 게시물 미디어 크레딧 라벨 — OnlyFans 스타일 워터마크 텍스트 */

export type WatermarkOptions = {
  diagonal: boolean;
  corner: boolean;
};

export const EMPTY_WATERMARK_OPTIONS: WatermarkOptions = {
  diagonal: false,
  corner: false,
};

export function hasActiveWatermark(options?: WatermarkOptions | null): boolean {
  return !!(options?.diagonal || options?.corner);
}

export function watermarkSiteHost(): string {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net"
      : "https://mocomo.net";
  try {
    return new URL(raw).host.replace(/^www\./, "");
  } catch {
    return "mocomo.net";
  }
}

export function buildPostCreditLabel(username: string): string {
  const handle = username.trim().replace(/^@/, "");
  return `@${handle} · ${watermarkSiteHost()}`;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 서버 sharp 합성용 SVG 오버레이 */
export function buildWatermarkSvg(
  width: number,
  height: number,
  label: string,
  options: WatermarkOptions = { diagonal: true, corner: true }
): string {
  const short = Math.min(width, height);
  const fontSize = Math.max(14, Math.round(short * 0.032));
  const tileSize = Math.max(12, Math.round(fontSize * 0.72));
  const pad = Math.round(fontSize * 0.55);
  const safe = escapeXml(label);

  const parts: string[] = [];

  if (options.diagonal) {
    const tiles: string[] = [];
    const stepY = Math.max(110, Math.round(short * 0.26));
    const stepX = Math.round(stepY * 1.55);
    for (let y = -height; y < height * 1.5; y += stepY) {
      for (let x = -width; x < width * 1.5; x += stepX) {
        tiles.push(
          `<text x="${x}" y="${y}" fill="white" fill-opacity="0.14" stroke="black" stroke-opacity="0.22" stroke-width="0.6" font-family="system-ui,sans-serif" font-size="${tileSize}" font-weight="600">${safe}</text>`
        );
      }
    }
    parts.push(`<g transform="translate(${width / 2} ${height / 2}) rotate(-24)">${tiles.join("")}</g>`);
  }

  if (options.corner) {
    const cornerW = Math.min(width * 0.72, label.length * fontSize * 0.58 + pad * 2);
    const cornerH = fontSize + pad * 1.35;
    const cornerX = width - cornerW - pad;
    const cornerY = height - cornerH - pad;
    parts.push(
      `<rect x="${cornerX}" y="${cornerY}" width="${cornerW}" height="${cornerH}" rx="8" fill="black" fill-opacity="0.58"/>`,
      `<text x="${cornerX + pad}" y="${cornerY + cornerH / 2 + fontSize * 0.35}" fill="white" font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="700">${safe}</text>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join("")}</svg>`;
}
