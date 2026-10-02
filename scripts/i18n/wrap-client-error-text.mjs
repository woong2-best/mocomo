/**
 * Wrap action/API error values shown to users in errorText(), so catalog codes render as English.
 * Shapes handled (X = ident.error | ident?.error | ident.errorKey):
 *   setFoo(X)                 → setFoo(errorText(X))
 *   setFoo(X ?? fallback)     → setFoo(errorText(X ?? fallback))
 *   toast*(X) / push*Toast(X) → same
 *   message: X[ ?? fallback]  → message: errorText(X[ ?? fallback])
 *   {X} in JSX                → {errorText(X)}
 * Usage: node scripts/i18n/wrap-client-error-text.mjs [--dry] src/components src/app
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const roots = args.filter((a) => a !== "--dry");
if (!roots.length) roots.push("src/components", "src/app");

const ERR = String.raw`[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*?\??\.(?:error|errorKey)`;
const FALLBACK = String.raw`(?:\s*\?\?\s*(?:"[^"\n]*"|'[^'\n]*'|t\("[^"\n]+"(?:,\s*\{[^}\n]*\})?\)|\([^()\n]*\)|[\w$.?]+))?`;

const CALL_RE = new RegExp(
  String.raw`\b((?:set[A-Z]\w*|push\w*Toast|toast(?:\.\w+)?|show\w*Toast))\(\s*(${ERR}${FALLBACK})\s*\)`,
  "g"
);
const MESSAGE_RE = new RegExp(String.raw`(\bmessage:\s*)(${ERR}${FALLBACK})(?=\s*[,}\n])`, "g");
const JSX_RE = new RegExp(String.raw`(>\s*|^\s*)\{(${ERR})\}`, "gm");
const THROW_RE = new RegExp(String.raw`(\bthrow new Error\(\s*|\bonError\?\.\(\s*)(${ERR}${FALLBACK})(?=\s*\))`, "g");
/** API routes: `error: X` in JSON bodies (mobile app renders these directly). */
const API_ERROR_RE = new RegExp(String.raw`(\berror:\s*)(${ERR}${FALLBACK})(?=\s*[,}\n])`, "g");

function walk(d, files = []) {
  if (!fs.existsSync(d)) return files;
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
  return files;
}

function ensureImport(src) {
  if (/import \{[^}]*\berrorText\b[^}]*\} from "@\/lib\/i18n\/error-text"/.test(src)) return src;
  const line = `import { errorText } from "@/lib/i18n/error-text";\n`;
  const directive = src.match(/^(["']use (?:client|server)["'];?\s*\n)/);
  if (directive) return src.replace(directive[1], `${directive[1]}\n${line}`);
  return line + src;
}

let filesChanged = 0;
let sites = 0;
for (const root of roots) {
  for (const file of walk(path.join(process.cwd(), root))) {
    const original = fs.readFileSync(file, "utf8");
    let src = original;
    let count = 0;
    src = src.replace(CALL_RE, (_, fn, expr) => {
      count++;
      return `${fn}(errorText(${expr}))`;
    });
    src = src.replace(MESSAGE_RE, (m, head, expr) => {
      if (expr.startsWith("errorText(")) return m;
      count++;
      return `${head}errorText(${expr})`;
    });
    src = src.replace(JSX_RE, (_, lead, expr) => {
      count++;
      return `${lead}{errorText(${expr})}`;
    });
    src = src.replace(THROW_RE, (m, head, expr) => {
      if (expr.startsWith("errorText(")) return m;
      count++;
      return `${head}errorText(${expr})`;
    });
    if (/[\\/]app[\\/]api[\\/]/.test(file)) {
      src = src.replace(API_ERROR_RE, (m, head, expr) => {
        if (expr.startsWith("errorText(")) return m;
        count++;
        return `${head}errorText(${expr})`;
      });
    }
    if (!count) continue;
    src = ensureImport(src);
    sites += count;
    filesChanged++;
    console.log(`${path.relative(process.cwd(), file)} (${count})`);
    if (!dry) fs.writeFileSync(file, src, "utf8");
  }
}
console.log(`${dry ? "[dry] " : ""}${sites} sites in ${filesChanged} files`);
