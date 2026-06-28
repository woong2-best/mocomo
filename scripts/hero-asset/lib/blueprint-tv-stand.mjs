import fs from "fs";
import path from "path";
import sharp from "sharp";

export async function generateTvStandBlueprint(analysis, outDir, title = "TV Stand + TV Graybox") {
  const m = analysis.meters;
  const W = 1400;
  const H = 1080;
  const pad = 20;
  const pw = Math.floor((W - pad * 4) / 3);
  const ph = Math.floor((H - pad * 3) / 2);
  const sc = Math.min;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;");
  }

  function panel(x, y, panelTitle, draw) {
    return `<g transform="translate(${x},${y})"><rect width="${pw}" height="${ph}" fill="#FAF6F0" stroke="#4A4038" stroke-width="2" rx="8"/>
      <text x="${pw / 2}" y="20" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="700">${esc(panelTitle)}</text>
      <g transform="translate(${pw / 2},${ph / 2 + 8})">${draw(pw - 36, ph - 52)}</g></g>`;
  }

  function front(cw, ch) {
    const s = sc(cw / m.cabinetWidth, ch / m.overallHeight) * 0.82;
    const Wm = m.cabinetWidth * s;
    const Hm = m.overallHeight * s;
    const legH = m.legHeight * s;
    const cabH = m.cabinetHeight * s;
    const tvH = m.tvHeight * s;
    const tvW = m.tvWidth * s;
    const y0 = Hm / 2;
    let g = `<rect x="${-Wm / 2}" y="${y0 - legH - cabH}" width="${Wm}" height="${cabH}" rx="${m.cornerRadius * s}" fill="#C9956A" stroke="#4A4038"/>`;
    g += `<rect x="${-tvW / 2}" y="${y0 - Hm}" width="${tvW}" height="${tvH}" rx="3" fill="#4A4848" stroke="#4A4038"/>`;
    g += `<text x="0" y="${Hm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">cab ${m.cabinetWidth.toFixed(2)}m · TV graybox</text>`;
    return g;
  }

  function side(cw, ch) {
    const s = sc(cw / m.cabinetDepth, ch / m.overallHeight) * 0.82;
    const Dm = m.cabinetDepth * s;
    const Hm = m.overallHeight * s;
    const cabH = m.cabinetHeight * s;
    const tvT = m.tvThickness * s;
    const tvH = m.tvHeight * s;
    const y0 = Hm / 2;
    return `<rect x="${-Dm / 2}" y="${y0 - m.legHeight * s - cabH}" width="${Dm}" height="${cabH}" rx="${m.cornerRadius * s}" fill="#C9956A" stroke="#4A4038"/>
      <rect x="${-Dm / 2 + Dm * 0.15}" y="${y0 - Hm}" width="${tvT}" height="${tvH}" rx="2" fill="#4A4848" stroke="#4A4038"/>
      <text x="0" y="${Hm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">D=${m.cabinetDepth.toFixed(3)}m</text>`;
  }

  function top(cw, ch) {
    const s = sc(cw / m.cabinetWidth, ch / m.cabinetDepth) * 0.82;
    const Wm = m.cabinetWidth * s;
    const Dm = m.cabinetDepth * s;
    const tvW = m.tvWidth * s;
    const tvD = m.tvThickness * s;
    return `<rect x="${-Wm / 2}" y="${-Dm / 2}" width="${Wm}" height="${Dm}" rx="${m.cornerRadius * s}" fill="#C9956A" stroke="#4A4038"/>
      <rect x="${-tvW / 2}" y="${-Dm / 2 + Dm * 0.08}" width="${tvW}" height="${tvD * 3}" rx="2" fill="#4A4848" stroke="#4A4038"/>`;
  }

  function iso(cw, ch) {
    const s = sc(cw / m.cabinetWidth, ch / m.overallHeight) * 0.55;
    const Wm = m.cabinetWidth * s;
    const Hm = m.overallHeight * s;
    const Dm = m.cabinetDepth * s * 0.55;
    const x0 = -Wm / 2;
    const y0 = Hm / 4;
    return `<polygon points="${x0},${y0} ${x0 + Wm},${y0} ${x0 + Wm + Dm},${y0 - Dm} ${x0 + Dm},${y0 - Dm}" fill="#C9956A" stroke="#4A4038"/>
      <polygon points="${x0 + Wm * 0.2},${y0 - Hm * 0.35} ${x0 + Wm * 0.8},${y0 - Hm * 0.35} ${x0 + Wm * 0.75 + Dm * 0.3},${y0 - Hm * 0.35 - Dm * 0.2} ${x0 + Wm * 0.25 + Dm * 0.3},${y0 - Hm * 0.35 - Dm * 0.2}" fill="#4A4848" stroke="#4A4038"/>`;
  }

  function sil(cw, ch) {
    const silPath = path.join(outDir, "reference-silhouette.png");
    if (!fs.existsSync(silPath)) return `<text font-size="10">Run reverse-engineering first</text>`;
    const b64 = fs.readFileSync(silPath).toString("base64");
    return `<image href="data:image/png;base64,${b64}" x="${-cw * 0.45}" y="${-ch * 0.38}" width="${cw * 0.9}" height="${ch * 0.76}"/>`;
  }

  function crossSection(cw, ch) {
    const s = sc(cw / m.cabinetWidth, ch / m.overallHeight) * 0.82;
    const Wm = m.cabinetWidth * s;
    const Hm = m.overallHeight * s;
    const cabH = m.cabinetHeight * s;
    const y0 = Hm / 2;
    return `
      <line x1="${-Wm / 2}" y1="${y0}" x2="${Wm / 2}" y2="${y0}" stroke="#999"/>
      <rect x="${-Wm / 2}" y="${y0 - m.legHeight * s - cabH}" width="${Wm}" height="${cabH}" rx="${m.cornerRadius * s}" fill="#C9956A" stroke="#4A4038"/>
      <rect x="${-m.tvWidth * 0.5 * s}" y="${y0 - Hm}" width="${m.tvWidth * s}" height="${m.tvHeight * s}" fill="#4A4848" stroke="#4A4038"/>
      <text x="0" y="${-Hm / 2 - 6}" text-anchor="middle" font-size="8" fill="#666">low · long · focal axis · no screen glow</text>`;
  }

  const panels = [
    { t: "Front", x: pad, y: pad, d: front },
    { t: "Side", x: pad * 2 + pw, y: pad, d: side },
    { t: "45° Iso", x: pad * 3 + pw * 2, y: pad, d: iso },
    { t: "Top", x: pad, y: pad * 2 + ph, d: top },
    { t: "Silhouette", x: pad * 2 + pw, y: pad * 2 + ph, d: sil },
    { t: "Cross Section", x: pad * 3 + pw * 2, y: pad * 2 + ph, d: crossSection },
  ];

  const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 36}" viewBox="0 0 ${W} ${H + 36}">
    <rect width="100%" height="100%" fill="#EBE4D8"/>
    <text x="${W / 2}" y="16" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="800" fill="#4A4038">Hero Asset Blueprint — ${esc(title)}</text>
    ${panels.map((p) => panel(p.x, p.y, p.t, p.d)).join("")}
    <text x="${W / 2}" y="${H + 24}" text-anchor="middle" font-size="10" fill="#666">Cross Section: cabinet proportion · TV graybox · focal height</text>
  </svg>`;

  fs.writeFileSync(path.join(outDir, "shape-blueprint.svg"), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, "shape-blueprint.png"));
}
