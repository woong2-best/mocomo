// List Korean (Hangul) in src ts/tsx files (non-comment lines). node scripts/i18n/audit-korean-in-src.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");
const hangul = /[가-힣]/;
const exts = new Set([".ts", ".tsx"]);

function stripComments(line) {
  let s = line;
  const block = s.indexOf("/*");
  if (block >= 0) s = s.slice(0, block);
  const slash = s.indexOf("//");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, out);
      continue;
    }
    const ext = path.extname(name);
    if (!exts.has(ext)) continue;
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const code = stripComments(lines[i]);
      if (hangul.test(code)) count++;
    }
    if (count > 0) out.push({ file: rel, count });
  }
}

const files = [];
walk(root, files);
files.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
const total = files.reduce((s, f) => s + f.count, 0);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ total, files }, null, 2));
} else {
  const md = [
    "# i18n TODO — Hangul in `src` (non-comment lines)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `**Total lines with Hangul:** ${total}`,
    `**Files:** ${files.length}`,
    "",
    "| Count | File |",
    "|------:|------|",
    ...files.map((f) => `| ${f.count} | \`${f.file}\` |`),
    "",
  ].join("\n");
  fs.mkdirSync(path.join(process.cwd(), "docs"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "docs/i18n-todo.md"), md, "utf8");
  console.log(`Wrote docs/i18n-todo.md — ${files.length} files, ${total} lines`);
}
