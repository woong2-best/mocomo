import fs from "fs";
import path from "path";

const SKIP = new Set(["node_modules", ".next", "star-market"]);
const roots = ["src", "apps/mobile/src"];

function replaceUrls(content) {
  return content
    .replace(/"\/used/g, '"/market')
    .replace(/'\/used/g, "'/market")
    .replace(/`\/used/g, "`/market")
    .replace(/\^\\\/used/g, "^\\/market")
    .replace(/callbackUrl=\/used/g, "callbackUrl=/market");
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|json)$/.test(ent.name)) {
      const c = fs.readFileSync(p, "utf8");
      const n = replaceUrls(c);
      if (n !== c) {
        fs.writeFileSync(p, n);
        console.log("updated", p);
      }
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) walk(root);
}
