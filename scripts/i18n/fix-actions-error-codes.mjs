/** Server actions must return error code strings, not t("key"). */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src/actions");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));

let n = 0;
for (const name of files) {
  const file = path.join(dir, name);
  let src = fs.readFileSync(file, "utf8");
  let out = src;

  out = out.replace(/return\s*\{\s*error:\s*t\("([^"]+)"\)\s*\}/g, 'return { error: "$1" }');
  out = out.replace(/error:\s*t\("([^"]+)"\)/g, 'error: "$1"');
  out = out.replace(/throw new Error\(t\("([^"]+)"\)\)/g, 'throw new Error("$1")');

  if (out.includes('"use server"')) {
    out = out.replace(/^import \{ createTranslator \}[^\n]+\nconst t = createTranslator\("en"\);\n\n?/m, "");
    out = out.replace(/^import \{ createTranslator \}[^\n]+\nconst t = createTranslator\("en"\);\n/m, "");
    const useServer = out.match(/["']use server["'];?\s*\n/);
    if (useServer && !out.trimStart().startsWith('"use server"')) {
      out = out.replace(/["']use server["'];?\s*\n/, "");
      out = `"use server";\n\n${out.trimStart()}`;
    }
  }

  if (out !== src) {
    fs.writeFileSync(file, out, "utf8");
    n++;
    console.log("fixed", name);
  }
}
console.log(`Fixed ${n} action files`);
