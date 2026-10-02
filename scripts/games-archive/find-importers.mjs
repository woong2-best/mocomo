import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { WEB_MOVE_SET, inMoveSet } from "./move-set.mjs";

const files = execSync("git ls-files src server", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(tsx?|mjs|cjs|js)$/.test(f));

const IMPORT_RE = /(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;

function resolveSpec(from, spec) {
  if (spec.startsWith("@/")) return "src/" + spec.slice(2);
  if (spec.startsWith(".")) return path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  return null;
}

function hits(target) {
  const candidates = [target, ...[".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"].map((e) => target + e)];
  return candidates.some((c) => inMoveSet(c));
}

const out = new Map();
for (const f of files) {
  if (inMoveSet(f)) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    const target = resolveSpec(f, spec);
    if (target && hits(target)) {
      if (!out.has(f)) out.set(f, new Set());
      out.get(f).add(spec);
    }
  }
}

for (const [f, specs] of [...out].sort()) console.log(`${f}\n    ${[...specs].join("\n    ")}`);
console.error(`\n${out.size} external importers of ${WEB_MOVE_SET.length} archived paths`);
