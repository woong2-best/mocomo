// Fail CI if Hangul appears in src ts/tsx (non-comment lines). node scripts/ci/check-no-hangul-in-src.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");
const hangul = /[가-힣]/;
const exts = new Set([".ts", ".tsx"]);

function stripComments(line) {
  let s = line;
  const block = s.indexOf("/*");
  if (block >= 0) s = s.slice(0, block);
  const slash = s.indexOf("//");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

function walk(dir, hits) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      walk(p, hits);
      continue;
    }
    const ext = path.extname(name);
    if (!exts.has(ext)) continue;
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (hangul.test(stripComments(lines[i]))) {
        hits.push(`${rel}:${i + 1}`);
      }
    }
  }
}

const hits = [];
walk(root, hits);
if (hits.length > 0) {
  console.error(`Hangul in src (${hits.length} lines). First 30:`);
  for (const h of hits.slice(0, 30)) console.error(h);
  process.exit(1);
}
console.log("OK: no Hangul in src ts/tsx (non-comment lines)");
