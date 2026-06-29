import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(ent.name)) acc.push(p.replace(/\\/g, "/"));
  }
  return acc;
}

const files = [...walk("src"), ...walk("studio")];
const invalid = [];
for (const f of files) {
  const buf = fs.readFileSync(f);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    decoder.decode(buf);
  } catch {
    invalid.push(f);
  }
}
console.log(invalid.join("\n"));
