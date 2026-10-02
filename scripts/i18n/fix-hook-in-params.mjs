/** Move mistaken `const { t } = useLocale()` out of destructuring params. */
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
  if (!src.includes("const { t } = useLocale();")) continue;

  let out = src.replace(
    /(export function \w+\(\{\n)\s*const \{ t \} = useLocale\(\);\s*\n/g,
    "$1"
  );
  out = out.replace(
    /(export function \w+\(\{\s*)const \{ t \} = useLocale\(\);\s*/g,
    "$1"
  );

  if (out !== src) {
    if (!/\}\)\s*\{[\s\S]*?const \{ t \} = useLocale\(\)/.test(out)) {
      out = out.replace(/(\)\s*\{)\s*\n(?!\s*const \{ t \} = useLocale\(\))/, "$1\n  const { t } = useLocale();\n");
    }
    fs.writeFileSync(file, out, "utf8");
    fixed++;
    console.log("fixed", path.relative(process.cwd(), file));
  }
}
console.log(`Fixed ${fixed} files`);
