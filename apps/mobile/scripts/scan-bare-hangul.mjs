import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRS = [
  "src/features/live",
  "src/features/community",
  "src/features/anime",
  "src/features/compose",
  "src/payments",
  "src/features/auth",
  "src/features/star",
  "src/features/search",
  "src/features/discover",
  "src/features/activity",
  "src/features/events",
  "src/features/games",
  "src/features/reels",
  "src/features/legal",
];

const hang = /[\uAC00-\uD7A3]/;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function isWrapped(line, idx) {
  const before = line.slice(0, idx);
  return /\bu\s*\(\s*$/.test(before) || before.includes("uiText(") || before.includes("labelKo:");
}

const byFile = {};

for (const rel of DIRS) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const relFile = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    if (relFile.endsWith("-ui.ts") || relFile.endsWith("community-labels.ts") || relFile.endsWith("live-ui.ts")) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!hang.test(line)) continue;
      if (/^\s*(\*|\/\/)/.test(line)) continue;
      if (line.includes("hash:") && line.includes("#")) continue;
      if (line.includes("u(") && /u\s*\(\s*["'`]/.test(line)) continue;
      if (line.includes("uiText(")) continue;
      if (line.includes("labelKo:") || line.includes("ko:")) continue;
      let inI18nCall = false;
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        const L = lines[j];
        if ((L.includes("u(") || L.includes("uiText(")) && !/\);\s*$/.test(L.trim())) inI18nCall = true;
      }
      if (inI18nCall) continue;
      const re = /["']([^"']*[\uAC00-\uD7A3][^"']*)["']/g;
      let m;
      while ((m = re.exec(line))) {
        if (!isWrapped(line, m.index)) {
          byFile[relFile] = (byFile[relFile] ?? 0) + 1;
        }
      }
    }
  }
}

const files = Object.keys(byFile);
console.log(JSON.stringify({ fileCount: files.length, totalHits: Object.values(byFile).reduce((a, b) => a + b, 0), byFile }, null, 2));
