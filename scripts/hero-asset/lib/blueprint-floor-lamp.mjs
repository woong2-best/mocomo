import fs from "fs";
import path from "path";
import sharp from "sharp";

export async function generateFloorLampBlueprint(analysis, outDir, title = "CS-06 Floor Lamp") {
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
    const s = sc(cw / m.overallWidth, ch / m.overallHeight) * 0.82;
    const Wm = m.overallWidth * s;
    const Hm = m.overallHeight * s;
    const baseH = m.baseHeight * s;
    const baseW = m.baseDiameter * s;
    const shadeH = m.shadeHeight * s;
    const shadeW = m.shadeBottomRadius * 2 * s;
    const y0 = Hm / 2;
    let g = `<ellipse cx="0" cy="${y0 - baseH / 2}" rx="${baseW / 2}" ry="${baseH * 0.8}" fill="#9A9088" stroke="#4A4038"/>`;
    g += `<rect x="${-m.poleRadius * s}" y="${y0 - Hm + baseH}" width="${m.poleRadius * 2 * s}" height="${Hm - baseH - shadeH}" fill="#8A8480" stroke="#4A4038"/>`;
    g += `<path d="M ${-shadeW / 2} ${y0 - Hm + baseH + (Hm - baseH - shadeH)} L ${-m.shadeTopRadius * s} ${y0 - Hm + baseH + (Hm - baseH - shadeH) - shadeH} L ${m.shadeTopRadius * s} ${y0 - Hm + baseH + (Hm - baseH - shadeH) - shadeH} L ${shadeW / 2} ${y0 - Hm + baseH + (Hm - baseH - shadeH)} Z" fill="#FAF0E0" stroke="#4A4038"/>`;
    g += `<text x="0" y="${Hm / 2 + 18}" text-anchor="middle" font-size="9" fill="#666">H=${m.overallHeight.toFixed(3)}m</text>`;
    return g;
  }

  function side(cw, ch) {
    return front(cw, ch);
  }

  function top(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallDepth) * 0.82;
    return `<circle cx="0" cy="0" r="${m.shadeBottomRadius * s}" fill="#FAF0E0" stroke="#4A4038"/>
      <circle cx="0" cy="0" r="${m.poleRadius * 3 * s}" fill="#8A8480" stroke="#4A4038"/>
      <circle cx="0" cy="0" r="${m.baseDiameter * 0.5 * s}" fill="#9A9088" stroke="#4A4038" opacity="0.5"/>`;
  }

  function iso(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallHeight) * 0.55;
    const Wm = m.overallWidth * s;
    const Hm = m.overallHeight * s;
    const Dm = m.overallDepth * s * 0.55;
    const x0 = -Wm / 2;
    const y0 = Hm / 4;
    return `<polygon points="${x0},${y0} ${x0 + Wm},${y0} ${x0 + Wm + Dm},${y0 - Dm} ${x0 + Dm},${y0 - Dm}" fill="#FAF0E0" stroke="#4A4038"/>
      <line x1="${x0 + Wm / 2}" y1="${y0}" x2="${x0 + Wm / 2 + Dm / 2}" y2="${y0 - Hm - Dm / 2}" stroke="#8A8480" stroke-width="2"/>`;
  }

  function sil(cw, ch) {
    const silPath = path.join(outDir, "reference-silhouette.png");
    if (!fs.existsSync(silPath)) return `<text font-size="10">Run reverse-engineering first</text>`;
    const b64 = fs.readFileSync(silPath).toString("base64");
    return `<image href="data:image/png;base64,${b64}" x="${-cw * 0.45}" y="${-ch * 0.38}" width="${cw * 0.9}" height="${ch * 0.76}"/>`;
  }

  function crossSection(cw, ch) {
    const s = sc(cw / m.overallWidth, ch / m.overallHeight) * 0.82;
    const Hm = m.overallHeight * s;
    const baseH = m.baseHeight * s;
    const shadeH = m.shadeHeight * s;
    const y0 = Hm / 2;
    return `
      <line x1="${-m.baseDiameter * s}" y1="${y0}" x2="${m.baseDiameter * s}" y2="${y0}" stroke="#999"/>
      <rect x="${-m.baseDiameter * 0.5 * s}" y="${y0 - baseH}" width="${m.baseDiameter * s}" height="${baseH}" rx="2" fill="#9A9088" stroke="#4A4038"/>
      <rect x="${-m.poleRadius * s}" y="${y0 - Hm + baseH}" width="${m.poleRadius * 2 * s}" height="${Hm - baseH - shadeH}" fill="#8A8480" stroke="#4A4038"/>
      <ellipse cx="0" cy="${y0 - Hm + baseH + (Hm - baseH - shadeH) - shadeH / 2}" rx="${m.shadeBottomRadius * s}" ry="${shadeH * 0.45}" fill="#FAF0E0" stroke="#4A4038"/>
      <text x="0" y="${-Hm / 2 - 6}" text-anchor="middle" font-size="8" fill="#666">slim pole · rounded shade · no emissive (Shape)</text>`;
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
    <text x="${W / 2}" y="${H + 24}" text-anchor="middle" font-size="10" fill="#666">Cross Section: base disk · pole · fabric shade · lighting deferred</text>
  </svg>`;

  fs.writeFileSync(path.join(outDir, "shape-blueprint.svg"), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, "shape-blueprint.png"));
}
