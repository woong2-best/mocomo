/**
 * Generate 5-view Shape Blueprint from shape-analysis.json
 * Output: public/apt/corner-sample/sofa/shape-blueprint.png
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/sofa");
const analysis = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "shape-analysis.json"), "utf8"));
const m = analysis.meters;

const W = 1280;
const H = 960;
const pad = 24;
const cols = 3;
const rows = 2;
const pw = Math.floor((W - pad * 4) / cols);
const ph = Math.floor((H - pad * 3) / rows);

function svgEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function panel(x, y, title, draw) {
  return `
  <g transform="translate(${x},${y})">
    <rect width="${pw}" height="${ph}" fill="#FAF6F0" stroke="#4A4038" stroke-width="2" rx="8"/>
    <text x="${pw / 2}" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#4A4038">${svgEscape(title)}</text>
    <g transform="translate(${pw / 2},${ph / 2 + 10})">${draw(pw - 40, ph - 60)}</g>
  </g>`;
}

function scaleFront(cw, ch) {
  const s = Math.min(cw / m.overallWidth, ch / m.overallHeight) * 0.85;
  return s;
}

function frontDraw(cw, ch) {
  const s = scaleFront(cw, ch);
  const Wm = m.overallWidth * s;
  const Hm = m.overallHeight * s;
  const arm = m.armWidth * s;
  const legH = m.legHeight * s;
  const seatH = m.seatCushionHeight * s;
  const backH = m.backCushionHeight * s;
  const inner = Wm - arm * 2;
  const gap = m.cushionGap * s;
  const backCount = analysis.counts.backCushions;
  const seatCount = analysis.counts.seatCushions;
  const cw2 = (inner - gap * (seatCount - 1)) / seatCount;
  const bcw = (inner - gap * (backCount - 1)) / backCount;
  const x0 = -Wm / 2;
  const y0 = Hm / 2;

  let g = `<rect x="${x0}" y="${y0 - Hm}" width="${Wm}" height="${Hm}" fill="none" stroke="#C9956A" stroke-width="1" stroke-dasharray="4 3"/>`;
  for (let i = 0; i < backCount; i++) {
    const cx = x0 + arm + i * (bcw + gap);
    g += `<rect x="${cx}" y="${y0 - legH - seatH - backH}" width="${bcw}" height="${backH}" rx="${m.cushionRadius * s}" fill="#D4C4B0" stroke="#4A4038"/>`;
  }
  for (let i = 0; i < seatCount; i++) {
    const cx = x0 + arm + i * (cw2 + gap);
    g += `<rect x="${cx}" y="${y0 - legH - seatH}" width="${cw2}" height="${seatH}" rx="${m.cushionRadius * s}" fill="#D4C4B0" stroke="#4A4038"/>`;
  }
  g += `<rect x="${x0}" y="${y0 - legH - seatH - backH}" width="${arm}" height="${seatH + backH}" rx="${m.armRadius * s}" fill="#D4C4B0" stroke="#4A4038"/>`;
  g += `<rect x="${x0 + Wm - arm}" y="${y0 - legH - seatH - backH}" width="${arm}" height="${seatH + backH}" rx="${m.armRadius * s}" fill="#D4C4B0" stroke="#4A4038"/>`;
  for (const lx of [0.14, 0.86]) {
    g += `<circle cx="${x0 + Wm * lx}" cy="${y0 - legH / 2}" r="${m.legThickness * s * 0.5}" fill="#C9956A"/>`;
  }
  g += `<text x="0" y="${Hm / 2 + 20}" text-anchor="middle" font-size="10" fill="#666">W=${m.overallWidth.toFixed(3)}m H=${m.overallHeight.toFixed(3)}m</text>`;
  return g;
}

function sideDraw(cw, ch) {
  const s = Math.min(cw / m.overallDepth, ch / m.overallHeight) * 0.85;
  const Dm = m.overallDepth * s;
  const Hm = m.overallHeight * s;
  const backT = m.backThickness * s;
  const legH = m.legHeight * s;
  const seatH = m.seatCushionHeight * s;
  const backH = m.backCushionHeight * s;
  const x0 = -Dm / 2;
  const y0 = Hm / 2;
  let g = `<rect x="${x0}" y="${y0 - Hm}" width="${Dm}" height="${Hm}" fill="none" stroke="#C9956A" stroke-dasharray="4 3"/>`;
  g += `<rect x="${x0}" y="${y0 - legH - seatH - backH}" width="${backT}" height="${backH}" rx="${m.cushionRadius * s}" fill="#D4C4B0" stroke="#4A4038"/>`;
  g += `<rect x="${x0 + backT * 0.3}" y="${y0 - legH - seatH}" width="${Dm - backT * 0.5}" height="${seatH}" rx="${m.cushionRadius * s}" fill="#D4C4B0" stroke="#4A4038"/>`;
  g += `<circle cx="${x0 + Dm * 0.25}" cy="${y0 - legH / 2}" r="${m.legThickness * s * 0.5}" fill="#C9956A"/>`;
  g += `<circle cx="${x0 + Dm * 0.75}" cy="${y0 - legH / 2}" r="${m.legThickness * s * 0.5}" fill="#C9956A"/>`;
  g += `<text x="0" y="${Hm / 2 + 20}" text-anchor="middle" font-size="10" fill="#666">D=${m.overallDepth.toFixed(3)}m</text>`;
  return g;
}

function topDraw(cw, ch) {
  const s = Math.min(cw / m.overallWidth, ch / m.overallDepth) * 0.85;
  const Wm = m.overallWidth * s;
  const Dm = m.overallDepth * s;
  const arm = m.armWidth * s;
  const x0 = -Wm / 2;
  const z0 = -Dm / 2;
  let g = `<rect x="${x0}" y="${z0}" width="${Wm}" height="${Dm}" rx="${m.cornerRadius * s}" fill="#D4C4B0" stroke="#4A4038"/>`;
  g += `<rect x="${x0}" y="${z0}" width="${arm}" height="${Dm}" rx="${m.armRadius * s}" fill="#CFC0AE" stroke="#4A4038"/>`;
  g += `<rect x="${x0 + Wm - arm}" y="${z0}" width="${arm}" height="${Dm}" rx="${m.armRadius * s}" fill="#CFC0AE" stroke="#4A4038"/>`;
  g += `<text x="0" y="${Dm / 2 + 24}" text-anchor="middle" font-size="10" fill="#666">Top · arm=${m.armWidth.toFixed(3)}m</text>`;
  return g;
}

function isoDraw(cw, ch) {
  const s = scaleFront(cw, ch) * 0.75;
  const Wm = m.overallWidth * s;
  const Hm = m.overallHeight * s;
  const Dm = m.overallDepth * s * 0.55;
  const x0 = -Wm / 2;
  const y0 = Hm / 3;
  const skew = Dm * 0.5;
  let g = `<polygon points="${x0},${y0} ${x0 + Wm},${y0} ${x0 + Wm + skew},${y0 - Dm} ${x0 + skew},${y0 - Dm}" fill="#D4C4B0" stroke="#4A4038"/>`;
  g += `<polygon points="${x0},${y0} ${x0},${y0 - Hm} ${x0 + skew},${y0 - Hm - Dm} ${x0 + skew},${y0 - Dm}" fill="#CFC0AE" stroke="#4A4038"/>`;
  g += `<text x="0" y="${Hm / 2 + 30}" text-anchor="middle" font-size="10" fill="#666">45° schematic</text>`;
  return g;
}

function silDraw(cw, ch) {
  const silPath = path.join(OUT_DIR, "reference-silhouette.png");
  const b64 = fs.readFileSync(silPath).toString("base64");
  const iw = cw * 0.9;
  const ih = ch * 0.75;
  return `
    <image href="data:image/png;base64,${b64}" x="${-iw / 2}" y="${-ih / 2}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>
    <text x="0" y="${ih / 2 + 16}" text-anchor="middle" font-size="10" fill="#666">Reference silhouette (extracted)</text>`;
}

const panels = [
  { title: "Front · 정면", x: pad, y: pad, draw: frontDraw },
  { title: "Side · 측면", x: pad * 2 + pw, y: pad, draw: sideDraw },
  { title: "45° · Iso", x: pad * 3 + pw * 2, y: pad, draw: isoDraw },
  { title: "Top · 평면", x: pad, y: pad * 2 + ph, draw: topDraw },
  { title: "Silhouette · 실루엣", x: pad * 2 + pw, y: pad * 2 + ph, draw: silDraw },
];

let svgPanels = panels.map((p) => panel(p.x, p.y, p.title, p.draw)).join("\n");

const specLines = [
  `W×D×H: ${m.overallWidth.toFixed(3)} × ${m.overallDepth.toFixed(3)} × ${m.overallHeight.toFixed(3)} m`,
  `Arms: ${m.armWidth.toFixed(3)}m · R=${m.armRadius.toFixed(3)}m · Back cushions: ${analysis.counts.backCushions}`,
  `Legs: H=${m.legHeight.toFixed(3)}m · Ø=${m.legThickness.toFixed(3)}m · offset X=${m.legOffsetX.toFixed(3)}m`,
].join("  ·  ");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 40}" viewBox="0 0 ${W} ${H + 40}">
  <rect width="100%" height="100%" fill="#EBE4D8"/>
  <text x="${W / 2}" y="18" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="800" fill="#4A4038">CS-02 Sofa Shape Blueprint (Reverse Engineered)</text>
  ${svgPanels}
  <text x="${W / 2}" y="${H + 28}" text-anchor="middle" font-size="11" fill="#666">${svgEscape(specLines)}</text>
</svg>`;

const outSvg = path.join(OUT_DIR, "shape-blueprint.svg");
const outPng = path.join(OUT_DIR, "shape-blueprint.png");
fs.writeFileSync(outSvg, svg);
await sharp(Buffer.from(svg)).png().toFile(outPng);
console.log("Wrote", outPng);
