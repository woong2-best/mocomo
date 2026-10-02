/**
 * AST-based bulk migration of Hangul UI strings to English.
 *
 *   node scripts/i18n/bulk-i18n.mjs extract <batch> <path...> [--direct]
 *       Finds Hangul strings (string literals, template literals with ${}, JSX text runs with
 *       inline expressions) and writes .build-tmp/i18n/<batch>/todo.tsv  ("id<TAB>korean").
 *       Strings already translated (prefill from main ko/en, or earlier fills) are skipped.
 *
 *   node scripts/i18n/bulk-i18n.mjs apply <batch> <path...> [--direct]
 *       Replaces every string that has an English fill with t("key") (or, with --direct, with the
 *       English text inline), writes new keys to en.json, and adds the module-level translator.
 *
 * Fills: .build-tmp/i18n/fills/*.tsv  — "id<TAB>english" per line (written by hand/agent).
 * Placeholders: `${name}` in the source becomes `{name}` (or {v0}, {v1}) in both Korean and English.
 *
 * Skipped on purpose (reported, never rewritten): comparisons/case labels/type literals/object keys,
 * .includes()/.startsWith()-style matchers, regex literals, comments.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const [mode, batch, ...rest] = process.argv.slice(2);
const direct = rest.includes("--direct");
const targets = rest.filter((a) => !a.startsWith("--"));
if (!mode || !batch || !targets.length) {
  console.error("Usage: bulk-i18n.mjs <extract|apply> <batch> <path...> [--direct]");
  process.exit(1);
}

const HANGUL = /[\uAC00-\uD7A3]/;
const workDir = path.join(root, ".build-tmp", "i18n");
const batchDir = path.join(workDir, batch);
const fillsDir = path.join(workDir, "fills");
fs.mkdirSync(batchDir, { recursive: true });
fs.mkdirSync(fillsDir, { recursive: true });
const enPath = path.join(root, "src/lib/i18n/locales/en.json");

const idOf = (ko) => crypto.createHash("sha1").update(ko).digest("hex").slice(0, 7);

// ---------------------------------------------------------------- fills & prefill
function loadFills() {
  const map = new Map();
  for (const f of fs.readdirSync(fillsDir)) {
    if (!f.endsWith(".tsv")) continue;
    for (const line of fs.readFileSync(path.join(fillsDir, f), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const tab = line.indexOf("\t");
      if (tab < 0) continue;
      const id = line.slice(0, tab).trim();
      const en = line.slice(tab + 1).replace(/\\n/g, "\n");
      if (id) map.set(id, en);
    }
  }
  return map;
}

function gitUtf8(ref) {
  try {
    return execSync(`git show ${ref}`, { encoding: "buffer", maxBuffer: 80 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] })
      .toString("utf8")
      .replace(/^\uFEFF/, "");
  } catch {
    return null;
  }
}
/** Korean -> English from main's ko.json/en.json (strings that already had a reviewed English twin). */
function loadPrefill() {
  const cache = path.join(workDir, "prefill.json");
  if (fs.existsSync(cache)) return new Map(Object.entries(JSON.parse(fs.readFileSync(cache, "utf8"))));
  const out = {};
  const koRaw = gitUtf8("main:src/lib/i18n/locales/ko.json");
  const enRaw = gitUtf8("main:src/lib/i18n/locales/en.json");
  if (koRaw && enRaw) {
    const ko = JSON.parse(koRaw);
    const en = JSON.parse(enRaw);
    for (const [k, v] of Object.entries(ko)) {
      const e = en[k];
      if (typeof v === "string" && typeof e === "string" && HANGUL.test(v) && !HANGUL.test(e) && !e.includes("[TODO") && e !== v) {
        out[v] = e;
      }
    }
  }
  fs.writeFileSync(cache, JSON.stringify(out));
  return new Map(Object.entries(out));
}

// ---------------------------------------------------------------- helpers on source text
const ENTITIES = { nbsp: "\u00A0", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", middot: "\u00B7", hellip: "\u2026", ndash: "\u2013", mdash: "\u2014", times: "\u00D7", rarr: "\u2192", larr: "\u2190", bull: "\u2022", copy: "\u00A9", laquo: "\u00AB", raquo: "\u00BB" };
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
/** JSX text whitespace rule (React): trim lines, drop empty ones, join with a space. */
function jsxTextValue(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let out = "";
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, " ");
    if (i > 0) l = l.replace(/^ +/, "");
    if (i < lines.length - 1) l = l.replace(/ +$/, "");
    if (l) {
      if (out && i > 0) out += " ";
      out += l;
    }
  });
  return decodeEntities(out);
}

const hasHangul = (s) => HANGUL.test(s);

function placeholderName(expr, used, idx) {
  let name = null;
  if (ts.isIdentifier(expr)) name = expr.text;
  else if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) name = expr.name.text;
  else if (ts.isNonNullExpression(expr)) return placeholderName(expr.expression, used, idx);
  else if (ts.isParenthesizedExpression(expr)) return placeholderName(expr.expression, used, idx);
  if (!name || !/^[A-Za-z_]\w*$/.test(name) || used.has(name)) name = `v${idx}`;
  used.add(name);
  return name;
}

const SKIP_METHODS = new Set(["includes", "startsWith", "endsWith", "indexOf", "lastIndexOf", "replace", "replaceAll", "split", "match", "matchAll", "localeCompare", "test", "search"]);
const COMPARE_OPS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

/** Why a Hangul string literal must stay as-is (null = convert it). */
function skipReason(node) {
  const p = node.parent;
  if (!p) return null;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return "module-specifier";
  if (ts.isLiteralTypeNode(p)) return "type-literal";
  if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === node) return "object-key";
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return "element-access";
  if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && SKIP_METHODS.has(p.expression.name.text)) return "matcher";
  if (ts.isEnumMember(p)) return "enum";
  return null;
}
const isConsoleArg = (node) => {
  const p = node.parent;
  return ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === "console";
};

// ---------------------------------------------------------------- analysis
/** @returns {{edits: object[], skipped: object[], regex: object[]}} */
function analyze(file, src) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const skipped = [];
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

  /** Does any descendant (not counting `self`) contain a Hangul string/template/jsx literal? */
  const containsHangulLiteral = (n) => {
    let found = false;
    const walk = (x) => {
      if (found) return;
      if ((ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) && hasHangul(x.text)) found = true;
      else if (ts.isTemplateHead(x) || ts.isTemplateMiddle(x) || ts.isTemplateTail(x)) {
        if (hasHangul(x.text)) found = true;
      } else if (ts.isJsxText(x) && hasHangul(x.text)) found = true;
      else ts.forEachChild(x, walk);
    };
    walk(n);
    return found;
  };

  const visit = (node) => {
    // ---- plain strings
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (hasHangul(node.text)) {
        const why = skipReason(node);
        if (why) {
          skipped.push({ line: lineOf(node.getStart(sf)), why, text: node.text.slice(0, 60) });
        } else {
          const inAttr = ts.isJsxAttribute(node.parent);
          edits.push({
            kind: "string",
            start: node.getStart(sf),
            end: node.end,
            korean: node.text,
            attr: inAttr,
            console: isConsoleArg(node),
            line: lineOf(node.getStart(sf)),
          });
        }
      }
      return;
    }
    // ---- template with substitutions
    if (ts.isTemplateExpression(node)) {
      const statics = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
      if (statics.some(hasHangul) && !ts.isTaggedTemplateExpression(node.parent)) {
        const used = new Set();
        const exprs = node.templateSpans.map((s, i) => ({
          name: placeholderName(s.expression, used, i),
          start: s.expression.getStart(sf),
          end: s.expression.end,
        }));
        let korean = node.head.text;
        node.templateSpans.forEach((s, i) => {
          korean += `{${exprs[i].name}}` + s.literal.text;
        });
        edits.push({
          kind: "template",
          start: node.getStart(sf),
          end: node.end,
          korean,
          exprs,
          attr: ts.isJsxAttribute(node.parent),
          console: isConsoleArg(node),
          line: lineOf(node.getStart(sf)),
        });
      }
      // still descend: nested Hangul literals inside ${...}
      node.templateSpans.forEach((s) => visit(s.expression));
      return;
    }
    // ---- JSX children runs
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const kids = node.children;
      let i = 0;
      while (i < kids.length) {
        const k = kids[i];
        const simple = (c) =>
          ts.isJsxText(c) ||
          (ts.isJsxExpression(c) && c.expression && !c.dotDotDotToken && isSimpleJsxExpr(c.expression));
        const isSimpleJsxExpr = (e) => {
          if (e.getText(sf).length > 100) return false;
          let bad = false;
          const w = (x) => {
            if (bad) return;
            if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x) || ts.isArrowFunction(x) || ts.isFunctionExpression(x)) bad = true;
            else if ((ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) && hasHangul(x.text)) bad = true;
            else if (ts.isTemplateExpression(x) && [x.head.text, ...x.templateSpans.map((s) => s.literal.text)].some(hasHangul)) bad = true;
            else ts.forEachChild(x, w);
          };
          w(e);
          return !bad;
        };
        if (!simple(k)) {
          i++;
          continue;
        }
        let j = i;
        while (j < kids.length && simple(kids[j])) j++;
        const run = kids.slice(i, j);
        i = j;
        if (!run.some((c) => ts.isJsxText(c) && hasHangul(c.text))) continue;
        // Build the message.
        const used = new Set();
        const exprs = [];
        let korean = "";
        for (const c of run) {
          if (ts.isJsxText(c)) korean += jsxTextValue(c.text);
          else if (ts.isStringLiteralLike(c.expression)) korean += c.expression.text; // {" "} etc.
          else {
            const name = placeholderName(c.expression, used, exprs.length);
            exprs.push({ name, start: c.expression.getStart(sf), end: c.expression.end });
            korean += `{${name}}`;
          }
        }
        // jsxTextValue per-child loses cross-child whitespace joins; acceptable (rare).
        const lead = korean.match(/^\s*/)[0];
        const trail = korean.match(/\s*$/)[0];
        const core = korean.trim();
        if (!core || !hasHangul(core)) continue;
        edits.push({
          kind: "jsx",
          start: run[0].pos,
          end: run[run.length - 1].end,
          korean: core,
          lead,
          trail,
          exprs,
          line: lineOf(run[0].getStart(sf)),
        });
      }
    }
    // ---- regex etc.
    if (ts.isRegularExpressionLiteral(node) && hasHangul(node.text)) {
      skipped.push({ line: lineOf(node.getStart(sf)), why: "regex", text: node.text.slice(0, 60) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { sf, edits, skipped };
}

// ---------------------------------------------------------------- applying
function renderRange(src, start, end, edits, ctx) {
  const inside = edits.filter((e) => e.start >= start && e.end <= end && !(e.start === start && e.end === end && e === ctx.self));
  inside.sort((a, b) => a.start - b.start || b.end - a.end);
  let out = "";
  let pos = start;
  for (const e of inside) {
    if (e.start < pos) continue; // nested in a previously rendered edit
    out += src.slice(pos, e.start);
    out += ctx.produce(e);
    pos = e.end;
  }
  return out + src.slice(pos, end);
}

function jsonStr(s) {
  return JSON.stringify(s);
}

// ---------------------------------------------------------------- key naming
function prefixFor(rel) {
  const parts = rel.replace(/\\/g, "/").replace(/^src\//, "").replace(/\.(tsx?|jsx?)$/, "").split("/");
  const skip = new Set(["components", "app", "lib", "api", "page", "route", "layout", "index"]);
  const seg = parts.filter((p) => !skip.has(p) && !/^\[.*\]$/.test(p) && !/^\(.*\)$/.test(p));
  const first = seg[0] ?? "ui";
  if (first === "actions" || first === "hooks") return first;
  return first.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "ui";
}
function slug(english) {
  const base = english
    .replace(/\{[^}]*\}/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("_")
    .toLowerCase();
  if (base.length >= 3) return base.slice(0, 40);
  let h = 0;
  for (let i = 0; i < english.length; i++) h = (h * 31 + english.charCodeAt(i)) >>> 0;
  return `s${h.toString(36).slice(0, 7)}`;
}

// ---------------------------------------------------------------- module translator injection
function ensureTranslator(src, file) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let hasImport = false;
  let hasConst = false;
  let lastImportEnd = -1;
  let afterDirectives = 0;
  let tTaken = false;
  for (const st of sf.statements) {
    if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) afterDirectives = st.end;
    if (ts.isImportDeclaration(st)) {
      lastImportEnd = st.end;
      const clause = st.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          if (el.name.text === "createTranslator") hasImport = true;
          if (el.name.text === "t") tTaken = true;
        }
      }
      if (clause?.name?.text === "t") tTaken = true;
    }
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === "t") {
          if (d.initializer && /createTranslator\(/.test(d.initializer.getText(sf))) hasConst = true;
          else tTaken = true;
        }
      }
    }
    if (ts.isFunctionDeclaration(st) && st.name?.text === "t") tTaken = true;
  }
  if (hasConst) return { src, name: "t" };
  const name = tTaken ? "tEn" : "t";
  let add = "";
  if (!hasImport) add += `import { createTranslator } from "@/lib/i18n/messages";\n`;
  const decl = `const ${name} = createTranslator("en");\n`;
  const insertAt = lastImportEnd >= 0 ? lastImportEnd : afterDirectives;
  // place import with other imports, const right after the import block
  const before = src.slice(0, insertAt);
  const after = src.slice(insertAt);
  const nl = src.includes("\r\n") ? "\r\n" : "\n";
  const block = `${nl}${add ? add.replace(/\n/g, nl) : ""}${decl.replace(/\n/g, nl)}`;
  return { src: before + block + after, name };
}

// ---------------------------------------------------------------- main
function walk(p, out = []) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const n of fs.readdirSync(p)) {
      if (n === "node_modules" || n === ".next" || n === "__tests__") continue;
      walk(path.join(p, n), out);
    }
  } else if (/\.(ts|tsx)$/.test(p) && !p.endsWith(".d.ts")) out.push(p);
  return out;
}
const expandTarget = (t) =>\n  t.startsWith("@")\n    ? fs.readFileSync(t.slice(1), "utf8").split(/\r?\n/).filter(Boolean).map((r) => path.resolve(r))\n    : walk(path.resolve(t));\nconst files = [...new Set(targets.flatMap((t) => (t.startsWith("@") ? expandTarget(t) : expandTarget(t))))];

if (mode === "extract") {
  const fills = loadFills();
  const prefill = loadPrefill();
  const todo = new Map(); // id -> korean
  const skipReport = [];
  let strings = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8").replace(/^\uFEFF/, "");
    if (!hasHangul(src)) continue;
    const { edits, skipped } = analyze(f, src);
    for (const e of edits) {
      strings++;
      const id = idOf(e.korean);
      if (!fills.has(id) && !prefill.has(e.korean) && !todo.has(id)) todo.set(id, e.korean);
    }
    for (const s of skipped) skipReport.push(`${path.relative(root, f)}:${s.line} [${s.why}] ${s.text}`);
  }
  const lines = [...todo.entries()].map(([id, ko]) => `${id}\t${ko.replace(/\r?\n/g, "\\n")}`);
  fs.writeFileSync(path.join(batchDir, "todo.tsv"), lines.join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(batchDir, "skipped.txt"), skipReport.join("\n") + "\n", "utf8");
  console.log(`extract ${batch}: ${files.length} files, ${strings} string sites, ${todo.size} unique strings need English, ${skipReport.length} skipped sites`);
} else if (mode === "apply") {
  const fills = loadFills();
  const prefill = loadPrefill();
  const en = JSON.parse(fs.readFileSync(enPath, "utf8").replace(/^\uFEFF/, ""));
  const byValue = new Map();
  for (const [k, v] of Object.entries(en)) if (!k.startsWith("actions.") && !byValue.has(v)) byValue.set(v, k);
  const stats = { files: 0, replaced: 0, missing: 0, newKeys: 0 };
  const missingList = [];

  const englishFor = (ko) => fills.get(idOf(ko)) ?? prefill.get(ko) ?? null;
  const keyFor = (english, prefix) => {
    const hit = byValue.get(english);
    if (hit) return hit;
    const base = `${prefix}.${slug(english)}`;
    let key = base;
    let n = 2;
    while (key in en && en[key] !== english) key = `${base}_${n++}`;
    if (!(key in en)) {
      en[key] = english;
      stats.newKeys++;
    }
    byValue.set(english, key);
    return key;
  };

  for (const f of files) {
    const rel = path.relative(root, f).replace(/\\/g, "/");
    let src = fs.readFileSync(f, "utf8").replace(/^\uFEFF/, "");
    if (!hasHangul(src)) continue;
    const { edits } = analyze(f, src);
    const active = [];
    for (const e of edits) {
      const english = englishFor(e.korean);
      if (english == null) {
        stats.missing++;
        missingList.push(`${rel}:${e.line} ${e.korean.slice(0, 50)}`);
        continue;
      }
      if (hasHangul(english) || english.includes("[TODO")) {
        console.error(`BAD FILL (Hangul/TODO) for ${idOf(e.korean)}: ${english}`);
        stats.missing++;
        continue;
      }
      e.english = english;
      active.push(e);
    }
    if (!active.length) continue;
    const prefix = prefixFor(rel);
    let usedT = false;
    let tName = "t";
    // decide translator name up-front (module-level `t` may be taken)
    const probe = ensureTranslator(src, f);
    tName = probe.name;

    const produce = (e) => {
      const useDirect = direct || e.console;
      const kor = e.korean;
      const english = e.english;
      const wrapLead = (expr) => expr;
      if (useDirect) {
        // inline English text
        if (e.kind === "string") return e.attr ? `{${jsonStr(english)}}` : jsonStr(english);
        if (e.kind === "template") {
          const text = english
            .replace(/[`\\]/g, "\\$&")
            .replace(/\$\{/g, "\\${")
            .replace(/\{([A-Za-z_]\w*)\}/g, (m, name) => {
              const ex = e.exprs.find((x) => x.name === name);
              return ex ? "${" + renderRange(src, ex.start, ex.end, active, { self: e, produce }) + "}" : m;
            });
          return e.attr ? "{`" + text + "`}" : "`" + text + "`";
        }
        // jsx in direct mode: fall through to t()
      }
      usedT = true;
      const key = keyFor(english, prefix);
      stats.replaced++;
      let call = `${tName}(${jsonStr(key)}`;
      if (e.exprs && e.exprs.length) {
        const props = e.exprs.map((x) => {
          const val = renderRange(src, x.start, x.end, active, { self: e, produce });
          return val === x.name ? x.name : `${x.name}: ${val}`;
        });
        call += `, { ${props.join(", ")} }`;
      }
      call += ")";
      if (e.kind === "jsx") {
        const lead = e.lead ? `{${jsonStr(e.lead)}}` : "";
        const trail = e.trail ? `{${jsonStr(e.trail)}}` : "";
        return `${lead}{${call}}${trail}`;
      }
      if (e.kind === "string" || e.kind === "template") {
        if (e.attr) return `{${call}}`;
      }
      return call;
    };

    // Apply: only top-level edits at document level; nested ones are rendered by their parent.
    const sorted = [...active].sort((a, b) => a.start - b.start || b.end - a.end);
    let out = "";
    let pos = 0;
    for (const e of sorted) {
      if (e.start < pos) continue;
      out += src.slice(pos, e.start) + produce(e);
      pos = e.end;
    }
    out += src.slice(pos);
    if (usedT) {
      const r = ensureTranslator(out, f);
      out = r.src;
    }
    fs.writeFileSync(f, out, "utf8");
    stats.files++;
  }
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(batchDir, "missing.txt"), missingList.join("\n") + "\n", "utf8");
  console.log(`apply ${batch}: ${stats.files} files, ${stats.replaced} replaced, ${stats.newKeys} new keys, ${stats.missing} still missing English`);
} else {
  console.error("unknown mode", mode);
  process.exit(1);
}
