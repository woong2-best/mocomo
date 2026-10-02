/** Replace module-level t("...") in client files with createTranslator("en"). */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2] || path.join(process.cwd(), "src/components/live");

function walk(d, files = []) {
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
  return files;
}

let fixed = 0;
for (const file of walk(dir)) {
  let src = fs.readFileSync(file, "utf8");
  const isClient = /["']use client["']/.test(src);
  if (!isClient) continue;
  const fnStart = src.search(/export function \w+/);
  if (fnStart < 0) continue;
  const head = src.slice(0, fnStart);
  if (!/\bt\s*\(\s*"/.test(head)) continue;
  if (head.includes("createTranslator")) continue;
  const out =
    head.replace(
      /(import[^\n]+\n)(?!import \{ createTranslator)/,
      `$1import { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n\n`
    ) || `import { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n\n${head}`;
  let newSrc = out + src.slice(fnStart);
  if (!newSrc.includes("createTranslator")) {
    newSrc = `import { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n\n${src}`;
  }
  if (newSrc !== src) {
    fs.writeFileSync(file, newSrc, "utf8");
    fixed++;
    console.log("module-t", path.relative(process.cwd(), file));
  }
}
console.log(`Fixed ${fixed} files`);
