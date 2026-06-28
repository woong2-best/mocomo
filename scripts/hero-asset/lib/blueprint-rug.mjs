import fs from "fs";
import path from "path";
import sharp from "sharp";

export async function generateRugBlueprint(analysis, outDir, title = "CS-03 Rug") {
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
    const s = sc(cw / m.overallWidth, ch / Math.max(m.overallHeight * 8, 0.08)) * 0.75;
    const Wm = m.overallWidth * s;
    const Tm = Math.max(m.overallHeight * s * 6, 6);
    return `<rect x="${-Wm / 2}" y="${-Tm / 2}" width="${Wm}" height="${Tm}" rx="${m.edgeBevelRadius * s * 4}" fill="#E8DDD0" stroke="#4A4038"/>
      <text x="0" y="${Tm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">W=${m.overallWidth.toFixed(3)}m T=${m.overallHeight.toFixed(3)}m</text>`;
  }

  function side(cw, ch) {
    const s = sc(cw / m.overallDepth, ch / Math.max(m.overallHeight * 8, 0.08)) * 0.75;
    const Dm = m.overallDepth * s;
    const Tm = Math.max(m.overallHeight * s * 6, 6);
    return `<rect x="${-Dm / 2}" y="${-Tm / 2}" width="${Dm}" height="${Tm}" rx="${m.edgeBevelRadius * s * 4}" fill="#E8DDD0" stroke="#4A4038"/>
      <text x="0" y="${Tm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">D=${m.overallDepth.toFixed(3)}m</text>`;
  }

  function top(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallDepth) * 0.82;
    const Wm = m.overallWidth * s;
    const Dm = m.overallDepth * s;
    return `<rect x="${-Wm / 2}" y="${-Dm / 2}" width="${Wm}" height="${Dm}" rx="${m.cornerRadius * s}" fill="#E8DDD0" stroke="#4A4038"/>
      <text x="0" y="${Dm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">rounded rect</text>`;
  }

  function iso(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallDepth) * 0.55;
    const Wm = m.overallWidth * s;
    const Dm = m.overallDepth * s * 0.55;
    const Tm = Math.max(m.overallHeight * s * 20, 8);
    const x0 = -Wm / 2;
    const y0 = Tm / 2;
    return `<polygon points="${x0},${y0} ${x0 + Wm},${y0} ${x0 + Wm + Dm},${y0 - Dm} ${x0 + Dm},${y0 - Dm}" fill="#E8DDD0" stroke="#4A4038"/>
      <polygon points="${x0},${y0} ${x0},${y0 - Tm} ${x0 + Dm},${y0 - Tm - Dm} ${x0 + Dm},${y0 - Dm}" fill="#DED4CA" stroke="#4A4038"/>`;
  }

  function sil(cw, ch) {
    const silPath = path.join(outDir, "reference-silhouette.png");
    if (!fs.existsSync(silPath)) return `<text font-size="10">Run reverse-engineering first</text>`;
    const b64 = fs.readFileSync(silPath).toString("base64");
    return `<image href="data:image/png;base64,${b64}" x="${-cw * 0.45}" y="${-ch * 0.38}" width="${cw * 0.9}" height="${ch * 0.76}"/>`;
  }

  function crossSection(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / Math.max(m.overallHeight * 10, 0.1)) * 0.82;
    const Wm = m.overallWidth * s;
    const Tm = Math.max(m.overallHeight * s * 8, 8);
    const x0 = -Wm / 2;
    const y0 = Tm;
    return `
      <line x1="${x0}" y1="${y0}" x2="${x0 + Wm}" y2="${y0}" stroke="#999"/>
      <rect x="${x0}" y="${y0 - Tm}" width="${Wm}" height="${Tm}" rx="${m.edgeBevelRadius * s * 4}" fill="#E8DDD0" stroke="#4A4038"/>
      <text x="0" y="${-8}" text-anchor="middle" font-size="8" fill="#666">elevation ${m.overallHeight.toFixed(3)}m · bevel R=${m.edgeBevelRadius.toFixed(3)}m</text>`;
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
    <text x="${W / 2}" y="${H + 24}" text-anchor="middle" font-size="10" fill="#666">Cross Section: pile elevation · edge bevel · corner radius</text>
  </svg>`;

  fs.writeFileSync(path.join(outDir, "shape-blueprint.svg"), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, "shape-blueprint.png"));
}
