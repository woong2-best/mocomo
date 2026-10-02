/**
 * Replace user-visible Korean in API route error/message JSON strings only.
 */
import fs from "node:fs";
import path from "node:path";

const hangul = /[가-힣]/;
const root = path.join(process.cwd(), "src/app/api");
const skipFiles = new Set([
  "src/app/api/live/[channelId]/whip/route.ts",
  "src/app/api/live/session/route.ts",
]);

const enJson = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));
let koEnIndex = new Map();
const idxPath = ".build-tmp/ko-en-index.json";
if (fs.existsSync(idxPath)) {
  koEnIndex = new Map(Object.entries(JSON.parse(fs.readFileSync(idxPath, "utf8"))));
}

function englishFor(ko) {
  const normalized = ko.replace(/\s+/g, " ").trim();
  const hit = koEnIndex.get(ko) ?? koEnIndex.get(normalized);
  if (hit?.en && !hangul.test(hit.en)) return hit.en.replace(/`/g, "'");
  for (const v of Object.values(enJson)) {
    if (v === ko || v === normalized) return String(v).replace(/`/g, "'");
  }
  const rules = [
    [/로그인|인증/, "Please sign in."],
    [/권한/, "You don't have permission to do that."],
    [/잘못|유효|올바르/, "Invalid request."],
    [/필요|입력/, "Required field missing."],
    [/실패|오류/, "Request failed."],
    [/없습니다|없음|못했/, "Not found."],
  ];
  for (const [re, msg] of rules) {
    if (re.test(ko)) return msg;
  }
  return null;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith(".ts")) files.push(p);
  }
  return files;
}

const skipped = [];
let changed = 0;

for (const file of walk(root)) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  if (skipFiles.has(rel)) continue;
  let code = fs.readFileSync(file, "utf8");
  const lines = code.split(/\r?\n/);
  let fileChanged = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!hangul.test(line)) continue;
    if (line.trimStart().startsWith("//") || line.includes("/*")) continue;
    if (!/(error|message|msg)\s*:/.test(line) && !/NextResponse\.json/.test(line)) continue;
    const next = line.replace(/(["'])((?:\\.|(?!\1)[^\\])*[가-힣](?:\\.|(?!\1)[^\\])*)\1/g, (m, q, inner) => {
      const decoded = inner.replace(/\\"/g, '"').replace(/\\'/g, "'");
      const en = englishFor(decoded);
      if (!en) {
        skipped.push(`${rel}:${i + 1}\t${decoded.slice(0, 80)}`);
        return m;
      }
      fileChanged = true;
      const esc = en.replace(/\\/g, "\\\\").replace(new RegExp(q, "g"), `\\${q}`);
      return q + esc + q;
    });
    lines[i] = next;
  }
  if (fileChanged) {
    fs.writeFileSync(file, lines.join("\n"));
    changed++;
    console.log("updated", rel);
  }
}

fs.writeFileSync(".build-tmp/api-error-skipped.txt", skipped.join("\n"), "utf8");
console.log("files", changed, "skipped", skipped.length);
