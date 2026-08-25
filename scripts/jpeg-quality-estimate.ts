/**
 * Estimate JPEG quality factor by matching DQT to IJG standard tables.
 * Usage: npx tsx scripts/jpeg-quality-estimate.ts <file-or-url>
 */
import fs from "node:fs";

const STD_LUMINANCE = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113,
  92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];

function stdTable(quality: number): number[] {
  const q = Math.max(1, Math.min(100, quality));
  const scale = q < 50 ? 5000 / q : 200 - q * 2;
  return STD_LUMINANCE.map((v) => {
    let val = Math.floor((v * scale + 50) / 100);
    val = Math.max(1, Math.min(255, val));
    return val;
  });
}

function parseDqt(buf: Buffer): number[] | null {
  let i = 2; // skip SOI
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xd9) break;
    if (marker === 0xdb) {
      const table = buf.subarray(i + 4, i + 2 + len);
      const precision = (table[0] >> 4) & 1;
      const values = table.subarray(1);
      if (precision === 0 && values.length >= 64) {
        return [...values.subarray(0, 64)];
      }
    }
    i += 2 + len;
  }
  return null;
}

function tableDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 64; i++) sum += Math.abs(a[i] - b[i]);
  return sum;
}

export function estimateJpegQuality(buf: Buffer): { bestQ: number; distance: number; isJpeg: boolean } {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    return { bestQ: -1, distance: Infinity, isJpeg: false };
  }
  const dqt = parseDqt(buf);
  if (!dqt) return { bestQ: -1, distance: Infinity, isJpeg: true };
  let bestQ = 50;
  let bestDist = Infinity;
  for (let q = 1; q <= 100; q++) {
    const dist = tableDistance(dqt, stdTable(q));
    if (dist < bestDist) {
      bestDist = dist;
      bestQ = q;
    }
  }
  return { bestQ, distance: bestDist, isJpeg: true };
}

async function loadInput(pathOrUrl: string): Promise<Buffer> {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const res = await fetch(pathOrUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(pathOrUrl);
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.log("Usage: npx tsx scripts/jpeg-quality-estimate.ts <file-or-url>");
    process.exit(1);
  }
  const buf = await loadInput(target);
  const est = estimateJpegQuality(buf);
  console.log(JSON.stringify({ bytes: buf.length, ...est }, null, 2));
}

if (process.argv[1]?.includes("jpeg-quality-estimate")) {
  void main();
}
