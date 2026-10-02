import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src/actions");
let n = 0;
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".ts")) continue;
  const file = path.join(dir, name);
  let src = fs.readFileSync(file, "utf8");
  if (!/\bt\(\s*"/.test(src)) continue;
  if (src.includes("createTranslator")) continue;
  src = src.replace(
    /^("use server";\s*\n)/,
    `$1\nimport { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n`
  );
  fs.writeFileSync(file, src, "utf8");
  n++;
  console.log(name);
}
console.log(`Added translator to ${n} files`);
