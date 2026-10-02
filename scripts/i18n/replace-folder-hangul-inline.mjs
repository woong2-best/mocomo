/**
 * Replace user-visible Hangul in string/JSX literals with inline English (no t(), no en.json writes).
 * Usage: node scripts/i18n/replace-folder-hangul-inline.mjs <folder>
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const hangul = /[가-힣]/;
const root = process.cwd();
const targetRel = process.argv[2];
const noRecurse = process.argv[3] === "no-recurse";
if (!targetRel) {
  console.error("Usage: replace-folder-hangul-inline.mjs <folder> [no-recurse]");
  process.exit(1);
}

const ALLOWLIST_FILES = new Set([
  "legal-content.ts",
  "korea-regions.ts",
  "world-countries.ts",
  "anime-wiki-infobox.ts",
]);

const skippedLog = path.join(root, ".build-tmp/inline-hangul-skipped.txt");
fs.mkdirSync(path.dirname(skippedLog), { recursive: true });

const enJson = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/en.json"), "utf8"));
let koEnIndex = new Map();
const idxPath = path.join(root, ".build-tmp/ko-en-index.json");
if (fs.existsSync(idxPath)) {
  try {
    koEnIndex = new Map(Object.entries(JSON.parse(fs.readFileSync(idxPath, "utf8"))));
  } catch {
    /* ignore */
  }
}

function logSkip(rel, line, reason, snippet) {
  fs.appendFileSync(skippedLog, `${rel}:${line}\t${reason}\t${snippet.slice(0, 60)}\n`, "utf8");
}

function sanitizeUiEnglish(en) {
  return en.replace(/`/g, "'").replace(/\r?\n/g, " ");
}

function englishFor(ko) {
  const normalized = ko.replace(/\s+/g, " ").trim();
  const hit = koEnIndex.get(ko) ?? koEnIndex.get(normalized);
  if (hit?.en && !hangul.test(hit.en)) return sanitizeUiEnglish(hit.en);
  for (const v of Object.values(enJson)) {
    if (v === ko || v === normalized) return sanitizeUiEnglish(String(v));
  }
  const rules = [
    [/실패|오류|에러/, "Something went wrong. Please try again."],
    [/로그인|인증/, "Please sign in to continue."],
    [/권한|허용/, "You don't have permission to do that."],
    [/없습니다|없어요/, "Not found."],
    [/필요|입력/, "Please check your input and try again."],
    [/완료|성공/, "Done."],
    [/취소/, "Cancelled."],
    [/삭제/, "Deleted."],
    [/저장/, "Saved."],
  ];
  for (const [re, msg] of rules) {
    if (re.test(ko)) return msg;
  }
  return null;
}

function uiText(en) {
  return sanitizeUiEnglish(en);
}

function escapeForQuote(text, quote) {
  let s = text;
  if (quote === "`") s = s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  else s = s.replace(/\\/g, "\\\\").replace(new RegExp(quote, "g"), `\\${quote}`);
  return s;
}

function isUnsafeBefore(code, i) {
  const before = code.slice(Math.max(0, i - 100), i);
  if (/(includes|startsWith|endsWith|indexOf|search|localeCompare|match)\s*\(\s*$/.test(before)) return "compare/call";
  if (/(===|!==|==|!=)\s*$/.test(before)) return "comparison";
  if (/case\s+$/.test(before)) return "case";
  if (/new\s+RegExp\s*\(\s*$/.test(before)) return "regex";
  if (/useState\s*<[^>]*>\s*$/.test(before)) return "useState generic";
  return null;
}

function isObjectKey(code, endQuoteIdx) {
  let j = endQuoteIdx + 1;
  while (j < code.length && /\s/.test(code[j])) j++;
  return code[j] === ":";
}

function closeTemplateLiteral(code, openIdx) {
  let j = openIdx + 1;
  while (j < code.length) {
    const c = code[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "`") return j;
    if (c === "$" && code[j + 1] === "{") {
      j += 2;
      let depth = 1;
      while (j < code.length && depth > 0) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === "`") {
          j = closeTemplateLiteral(code, j) + 1;
          continue;
        }
        if (code[j] === "{") depth++;
        else if (code[j] === "}") depth--;
        j++;
      }
      continue;
    }
    j++;
  }
  return code.length - 1;
}

function replaceInHtmlText(inner) {
  return inner.replace(/>([^<]*[가-힣][^<]*)</g, (seg, text) => {
    const trimmed = text.trim();
    if (!hangul.test(trimmed)) return seg;
    const en = englishFor(trimmed);
    if (!en) return seg;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return `>${lead}${en}${trail}<`;
  });
}

function replaceQuotedStrings(code, rel, lineStarts, onChange) {
  let out = "";
  let i = 0;
  let line = 1;
  while (i < code.length) {
    if (code[i] === "\n") line++;
    if (code[i] === "/" && code[i + 1] === "/") {
      let j = i;
      while (j < code.length && code[j] !== "\n" && code[j] !== "\r") j++;
      out += code.slice(i, j);
      i = j;
      continue;
    }
    if (code[i] === "/" && code[i + 1] === "*") {
      let j = i + 2;
      while (j < code.length - 1 && !(code[j] === "*" && code[j + 1] === "/")) j++;
      j = Math.min(code.length, j + 2);
      out += code.slice(i, j);
      i = j;
      continue;
    }
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      const j =
        quote === "`"
          ? closeTemplateLiteral(code, i)
          : (() => {
              let k = i + 1;
              let esc = false;
              while (k < code.length) {
                const c = code[k];
                if (esc) {
                  esc = false;
                  k++;
                  continue;
                }
                if (c === "\\") {
                  esc = true;
                  k++;
                  continue;
                }
                if (c === quote) break;
                k++;
              }
              return k;
            })();
      const inner = code.slice(i + 1, j);
      const unsafe = isUnsafeBefore(code, i);
      if (unsafe) {
        if (hangul.test(inner)) logSkip(rel, line, unsafe, inner);
        out += code.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      if (isObjectKey(code, j) && hangul.test(inner)) {
        logSkip(rel, line, "object-key", inner);
        out += code.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      if (/^https?:\/\//.test(inner.trim()) || /^[a-z0-9_-]+$/i.test(inner) && inner.length < 40 && !hangul.test(inner)) {
        out += code.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      if (quote !== "`" && hangul.test(inner)) {
        if (inner.includes("<") && inner.includes(">")) {
          const rebuilt = replaceInHtmlText(inner);
          if (rebuilt !== inner) {
            onChange();
            out += "`" + rebuilt + "`";
          } else {
            logSkip(rel, line, "no-english-html", inner.slice(0, 80));
            out += code.slice(i, j + 1);
          }
        } else if (!inner.includes("${")) {
          const en = englishFor(inner);
          if (en) {
            onChange();
            out += quote + escapeForQuote(en, quote) + quote;
          } else {
            logSkip(rel, line, "no-english", inner);
            out += code.slice(i, j + 1);
          }
        } else {
          logSkip(rel, line, "template-interp", inner);
          out += code.slice(i, j + 1);
        }
      } else if (quote === "`" && hangul.test(inner)) {
        if (inner.includes("${")) {
          let rebuilt = inner;
          rebuilt = rebuilt.replace(/(["'])([^"']*[가-힣][^"']*)\1/g, (m, q, txt) => {
            const en = englishFor(txt);
            if (!en) {
              logSkip(rel, line, "no-english", txt);
              return m;
            }
            onChange();
            return q + escapeForQuote(en, q) + q;
          });
          out += "`" + rebuilt + "`";
        } else {
          const en = englishFor(inner);
          if (en) {
            onChange();
            out += "`" + escapeForQuote(en, "`") + "`";
          } else {
            logSkip(rel, line, "no-english", inner);
            out += code.slice(i, j + 1);
          }
        }
      } else {
        out += code.slice(i, j + 1);
      }
      i = j + 1;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function replaceJsxText(code, rel, getLine, onChange) {
  return code.replace(/>([^<>\r\n{}]*[가-힣][^<>\r\n{}]*)</g, (match, text, offset) => {
    const before = code.slice(Math.max(0, offset - 400), offset);
    const singles = (before.match(/'/g) || []).length;
    const doubles = (before.match(/"/g) || []).length;
    const backticks = (before.match(/`/g) || []).length;
    if (singles % 2 === 1 || doubles % 2 === 1 || backticks % 2 === 1) return match;
    const trimmed = text.trim();
    if (!trimmed || !hangul.test(trimmed)) return match;
    const en = englishFor(trimmed);
    if (!en) {
      logSkip(rel, getLine(offset), "no-english-jsx", trimmed);
      return match;
    }
    onChange();
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return `>${lead}${uiText(en)}${trail}<`;
  });
}

function replaceJsxSibling(code, rel, getLine, onChange) {
  return code.replace(/(\})\s*([^<>{}\r\n]*[가-힣][^<>{}\r\n]*?)\s*(\{(?!\/\*))/g, (match, close, text, open, offset) => {
    const before = code.slice(0, offset);
    if ((before.match(/'/g) || []).length % 2 === 1) return match;
    if ((before.match(/"/g) || []).length % 2 === 1) return match;
    if ((before.match(/`/g) || []).length % 2 === 1) return match;
    const trimmed = text.trim();
    if (!hangul.test(trimmed)) return match;
    const en = englishFor(trimmed);
    if (!en) {
      logSkip(rel, getLine(offset), "no-english-jsx-sibling", trimmed);
      return match;
    }
    onChange();
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return `${close}${lead}${uiText(en)}${trail}${open}`;
  });
}

const SKIP_DIRS = new Set(["__tests__", "seed"]);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (noRecurse || SKIP_DIRS.has(name)) continue;
      walk(p, files);
      continue;
    }
    if (/\.(tsx|ts)$/.test(name) && !ALLOWLIST_FILES.has(name)) files.push(p);
  }
  return files;
}

const targetDir = path.join(root, targetRel);
const files = walk(targetDir);
let changedFiles = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const lineStarts = [];
  let pos = 0;
  for (const line of src.split(/\r?\n/)) {
    lineStarts.push(pos);
    pos += line.length + 1;
  }
  const getLine = (offset) => {
    for (let i = lineStarts.length - 1; i >= 0; i--) {
      if (offset >= lineStarts[i]) return i + 1;
    }
    return 1;
  };

  let touched = false;
  const onChange = () => {
    touched = true;
  };
  let modified = src;
  modified = replaceQuotedStrings(modified, rel, lineStarts, onChange);
  modified = replaceJsxText(modified, rel, getLine, onChange);
  modified = replaceJsxSibling(modified, rel, getLine, onChange);
  modified = modified.replace(/}\r?\n`\r?\n?$/g, "}\n");

  if (touched && modified !== src) {
    fs.writeFileSync(file, modified, "utf8");
    changedFiles++;
    console.log("updated", rel);
  }
}

console.log(`Done inline: ${changedFiles} files in ${targetRel}`);
