/** Locale is en-only — simplify `locale === "ko" ? a : b` to `b`. */
import fs from "node:fs";
import path from "node:path";

function walk(d, files = []) {
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name);
    if (fs.statSync(p).isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, files);
    } else if (/\.(tsx|ts)$/.test(name)) files.push(p);
  }
  return files;
}

const locales = ["ko", "ja", "zh", "zh-TW", "fil", "vi", "th"];
let n = 0;
for (const file of walk(path.join(process.cwd(), "src"))) {
  let src = fs.readFileSync(file, "utf8");
  let out = src;
  for (const loc of locales) {
    const re = new RegExp(
      `locale\\s*===\\s*["']${loc.replace("-", "\\-")}["']\\s*\\?\\s*([\\s\\S]*?)\\s*:\\s*`,
      "g"
    );
    out = out.replace(re, "");
    out = out.replace(
      new RegExp(`locale\\s*!==\\s*["']${loc.replace("-", "\\-")}["']\\s*\\?\\s*`, "g"),
      ""
    );
    out = out.replace(
      new RegExp(`_locale\\s*===\\s*["']${loc.replace("-", "\\-")}["']\\s*\\?\\s*([\\s\\S]*?)\\s*:\\s*`, "g"),
      ""
    );
  }
  if (out !== src) {
    fs.writeFileSync(file, out, "utf8");
    n++;
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`Updated ${n} files`);
