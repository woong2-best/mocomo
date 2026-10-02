/** Ensure every client file with t(" has module-level createTranslator("en"). */
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
    if (!/\bt\s*\(\s*["']/.test(src)) continue;
    if (/const\s+t\s*=\s*createTranslator/.test(src)) continue;

    const importLine = `import { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n\n`;
    if (src.includes('from "@/lib/i18n/messages"')) {
      src = src.replace(
        /import \{ createTranslator \} from "@\/lib\/i18n\/messages";\n/,
        ""
      );
    }
    src = src.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
    fs.writeFileSync(file, src, "utf8");
    fixed++;
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`Fixed ${fixed} files`);
