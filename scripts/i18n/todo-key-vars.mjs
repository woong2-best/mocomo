/** For en.json keys still marked [TODO translate], list interpolation vars passed at call sites. */
import fs from "node:fs";
import path from "node:path";

const en = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));
const todo = new Set(Object.keys(en).filter((k) => String(en[k]).startsWith("[TODO translate]")));
const used = {};

function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(n)) {
      const s = fs.readFileSync(p, "utf8");
      for (const m of s.matchAll(/\bt\(\s*"([\w.]+)"\s*,\s*\{([^}]*)\}/g)) {
        if (!todo.has(m[1])) continue;
        used[m[1]] = [...m[2].matchAll(/(\w+)\s*:/g)].map((x) => x[1]);
      }
    }
  }
}
walk("src");
fs.writeFileSync(".build-tmp/todo-vars.json", JSON.stringify(used, null, 1));
console.log(Object.keys(used).length);
for (const [k, v] of Object.entries(used)) console.log(`${k}\t${v.join(",")}\t${en[k]}`);
