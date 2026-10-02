/** Add `const { t } = useLocale();` when client file calls t() but never binds it. */
import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2);
if (!roots.length) roots.push("src/components", "src/app");

function walk(d, files = []) {
  if (!fs.existsSync(d)) return files;
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.tsx$/.test(name)) files.push(p);
  }
  return files;
}

function hasTBinding(src) {
  if (/createTranslator\s*\(/.test(src)) return true;
  if (/\bconst\s+t\s*=/.test(src)) return true;
  if (/\{\s*[^}]*\bt\b[^}]*\}\s*=\s*useLocale\s*\(\s*\)/.test(src)) return true;
  return false;
}

let fixed = 0;
for (const root of roots) {
  const dir = path.join(process.cwd(), root);
  for (const file of walk(dir)) {
    let src = fs.readFileSync(file, "utf8");
    if (!/["']use client["']/.test(src)) continue;
    if (!/\bt\s*\(\s*["']/.test(src)) continue;
    if (hasTBinding(src)) continue;

    if (!src.includes("useLocale")) {
      src = src.replace(
        /^(["']use client["'];?\s*\n)/,
        `$1import { useLocale } from "@/components/providers/locale-provider";\n`
      );
    }

    const fnRe = /function\s+(\w+)\s*\(\s*[^)]*\)\s*(?::\s*[^{]+)?\s*\{/;
    const m = fnRe.exec(src);
    if (!m) continue;
    const insertAt = m.index + m[0].length;
    const hook = "\n  const { t } = useLocale();\n";
    if (src.slice(insertAt, insertAt + 40).includes("useLocale()")) continue;

    src = src.slice(0, insertAt) + hook + src.slice(insertAt);
    fs.writeFileSync(file, src, "utf8");
    fixed++;
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`Fixed ${fixed} files`);
