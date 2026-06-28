import fs from "fs";
import path from "path";
import sharp from "sharp";

export async function generateCoffeeTableBlueprint(analysis, outDir, title = "CS-04 Coffee Table") {
  const m = analysis.meters;
  const W = 1400;
  const H = 1080;
  const pad = 20;
  const pw = Math.floor((W - pad * 4) / 3);
  const ph = Math.floor((H - pad * 3) / 2);

  function esc(s) {
    return String(s).replace(/&/g, "&amp;");
  }

  function panel(x, y, panelTitle, draw) {
    return `<g transform="translate(${x},${y})"><rect width="${pw}" height="${ph}" fill="#FAF6F0" stroke="#4A4038" stroke-width="2" rx="8"/>
      <text x="${pw / 2}" y="20" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="700">${esc(panelTitle)}</text>
      <g transform="translate(${pw / 2},${ph / 2 + 8})">${draw(pw - 36, ph - 52)}</g></g>`;
  }

  const sc = Math.min;
  const legCount = analysis.counts.legCount;

  function front(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallHeight) * 0.82;
    const Wm = m.overallWidth * s;
    const Hm = m.overallHeight * s;
    const topT = m.topThickness * s;
    const legH = m.legHeight * s;
    const legS = m.legSize * s;
    const inset = m.legInset * s;
    const x0 = -Wm / 2;
    const y0 = Hm / 2;
    let g = `<rect x="${x0}" y="${y0 - legH - topT}" width="${Wm}" height="${topT}" rx="${m.topBevelRadius * s}" fill="#C9956A" stroke="#4A4038"/>`;
    for (const sx of [-1, 1]) {
      g += `<rect x="${x0 + Wm / 2 + sx * (Wm / 2 - inset) - legS / 2}" y="${y0 - legH}" width="${legS}" height="${legH}" rx="${legS * 0.2}" fill="#B88458" stroke="#4A4038"/>`;
    }
    g += `<text x="0" y="${Hm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">W=${m.overallWidth.toFixed(3)}m H=${m.overallHeight.toFixed(3)}m</text>`;
    return g;
  }

  function side(cw, ch) {
    const s = sc(cw / m.overallDepth, ch / m.overallHeight) * 0.82;
    const Dm = m.overallDepth * s;
    const Hm = m.overallHeight * s;
    const topT = m.topThickness * s;
    const legH = m.legHeight * s;
    const legS = m.legSize * s;
    const inset = m.legInset * s;
    const x0 = -Dm / 2;
    const y0 = Hm / 2;
    return `<rect x="${x0}" y="${y0 - legH - topT}" width="${Dm}" height="${topT}" rx="${m.topBevelRadius * s}" fill="#C9956A" stroke="#4A4038"/>
      <rect x="${x0 + Dm / 2 - inset - legS / 2}" y="${y0 - legH}" width="${legS}" height="${legH}" rx="${legS * 0.2}" fill="#B88458" stroke="#4A4038"/>
      <text x="0" y="${Hm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">D=${m.overallDepth.toFixed(3)}m splay 6°</text>`;
  }

  function top(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallDepth) * 0.82;
    const Wm = m.overallWidth * s;
    const Dm = m.overallDepth * s;
    const legS = m.legSize * s;
    const inset = m.legInset * s;
    let g = `<rect x="${-Wm / 2}" y="${-Dm / 2}" width="${Wm}" height="${Dm}" rx="${m.cornerRadius * s}" fill="#C9956A" stroke="#4A4038"/>`;
    for (const [lx, lz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      g += `<rect x="${lx * (Wm / 2 - inset) - legS / 2}" y="${lz * (Dm / 2 - inset) - legS / 2}" width="${legS}" height="${legS}" rx="${legS * 0.18}" fill="#B88458" stroke="#4A4038"/>`;
    }
    return g;
  }

  function iso(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallHeight) * 0.55;
    const Wm = m.overallWidth * s;
    const Hm = m.overallHeight * s;
    const Dm = m.overallDepth * s * 0.55;
    const x0 = -Wm / 2;
    const y0 = Hm / 4;
    return `<polygon points="${x0},${y0} ${x0 + Wm},${y0} ${x0 + Wm + Dm},${y0 - Dm} ${x0 + Dm},${y0 - Dm}" fill="#C9956A" stroke="#4A4038"/>
      <polygon points="${x0},${y0} ${x0},${y0 - Hm} ${x0 + Dm},${y0 - Hm - Dm} ${x0 + Dm},${y0 - Dm}" fill="#B88458" stroke="#4A4038"/>`;
  }

  function sil(cw, ch) {
    const silPath = path.join(outDir, "reference-silhouette.png");
    if (!fs.existsSync(silPath)) return `<text font-size="10">Run reverse-engineering first</text>`;
    const b64 = fs.readFileSync(silPath).toString("base64");
    return `<image href="data:image/png;base64,${b64}" x="${-cw * 0.45}" y="${-ch * 0.38}" width="${cw * 0.9}" height="${ch * 0.76}"/>`;
  }

  function crossSection(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallHeight) * 0.82;
    const Wm = m.overallWidth * s;
    const Hm = m.overallHeight * s;
    const topT = m.topThickness * s;
    const legH = m.legHeight * s;
    const legS = m.legSize * s;
    const x0 = -Wm / 2;
    const y0 = Hm / 2;
    return `
      <line x1="${x0}" y1="${y0}" x2="${x0 + Wm}" y2="${y0}" stroke="#999"/>
      <rect x="${x0 + Wm * 0.12}" y="${y0 - legH}" width="${legS}" height="${legH}" rx="3" fill="#B88458" stroke="#4A4038"/>
      <rect x="${x0 + Wm * 0.78}" y="${y0 - legH}" width="${legS}" height="${legH}" rx="3" fill="#B88458" stroke="#4A4038"/>
      <rect x="${x0}" y="${y0 - legH - topT}" width="${Wm}" height="${topT}" rx="${m.topBevelRadius * s}" fill="#C9956A" stroke="#4A4038"/>
      <line x1="${x0 + 12}" y1="${y0 - legH - topT}" x2="${x0 + 52}" y2="${y0 - legH - topT}" stroke="#E53935" marker-end="url(#arr)"/>
      <text x="${x0 + 32}" y="${y0 - legH - topT - 6}" font-size="8" fill="#E53935">top ${m.topThickness.toFixed(3)}m</text>
      <text x="${x0 + 8}" y="${y0 - legH / 2}" font-size="8" fill="#666">leg ${m.legHeight.toFixed(3)}m × ${legCount}</text>`;
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
    <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#E53935"/></marker></defs>
    <rect width="100%" height="100%" fill="#EBE4D8"/>
    <text x="${W / 2}" y="16" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="800" fill="#4A4038">Hero Asset Blueprint — ${esc(title)}</text>
    ${panels.map((p) => panel(p.x, p.y, p.t, p.d)).join("")}
    <text x="${W / 2}" y="${H + 24}" text-anchor="middle" font-size="10" fill="#666">Cross Section: top slab · leg height · inset · bevel radius</text>
  </svg>`;

  fs.writeFileSync(path.join(outDir, "shape-blueprint.svg"), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, "shape-blueprint.png"));
}
