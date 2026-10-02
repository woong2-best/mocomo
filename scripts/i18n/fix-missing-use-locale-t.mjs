/** Add `t` to useLocale() destructure when file calls t() but lacks it. */
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

let fixed = 0;
for (const root of roots) {
  const dir = path.join(process.cwd(), root);
  for (const file of walk(dir)) {
    let src = fs.readFileSync(file, "utf8");
    if (!/["']use client["']/.test(src)) continue;
    if (!/\bt\s*\(\s*"/.test(src)) continue;
    if (src.includes("createTranslator")) continue;
    if (!src.includes("useLocale")) {
      src = src.replace(
        /^(["']use client["'];?\s*\n)/,
        `$1import { useLocale } from "@/components/providers/locale-provider";\n`
      );
    }
    if (/\{\s*t\s*\}\s*=\s*useLocale/.test(src)) continue;
    if (/const\s*\{\s*[^}]*,\s*t\s*\}\s*=\s*useLocale/.test(src)) continue;
    if (/const\s*\{\s*t\s*,/.test(src)) continue;

    const replaced = src.replace(
      /const\s*\{\s*([^}]+)\s*\}\s*=\s*useLocale\s*\(\s*\)\s*;/,
      (_, inner) => {
        const parts = inner.split(",").map((s) => s.trim()).filter(Boolean);
        if (parts.includes("t")) return `const { ${inner} } = useLocale();`;
        return `const { ${inner}, t } = useLocale();`;
      }
    );
    if (replaced !== src) {
      fs.writeFileSync(file, replaced, "utf8");
      fixed++;
      console.log(path.relative(process.cwd(), file));
    }
  }
}
console.log(`Fixed ${fixed} files`);
