/**
 * The site is English-only, so `locale === "ko" ? a : b` always yields the English branch.
 * AST-based: folds conditionals / ifs whose condition only compares a locale variable with
 * string literals, and drops non-English entries from `{ ko: ..., en: ... }` tables.
 *
 * Usage: node scripts/i18n/strip-locale-branches.mjs <path...>   (files or folders under repo root)
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const LOCALES = new Set(["ko", "en", "ja", "zh", "zh-TW", "zh-CN", "fil", "vi", "th", "id", "es", "pt", "de", "fr"]);
const LOCALE_IDENTS = new Set(["locale", "_locale", "lang", "currentLocale", "uiLocale", "userLocale", "language"]);

function isLocaleExpr(n) {
  while (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n)) n = n.expression;
  if (ts.isIdentifier(n)) return LOCALE_IDENTS.has(n.text);
  if (ts.isPropertyAccessExpression(n)) return n.name.text === "locale" || LOCALE_IDENTS.has(n.name.text);
  return false;
}
const strOf = (n) => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : null);

/** true/false when decidable assuming locale === "en"; undefined otherwise. */
function evalCond(n) {
  while (ts.isParenthesizedExpression(n)) n = n.expression;
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) {
    const v = evalCond(n.operand);
    return v === undefined ? undefined : !v;
  }
  if (ts.isBinaryExpression(n)) {
    const op = n.operatorToken.kind;
    if (
      op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      op === ts.SyntaxKind.EqualsEqualsToken ||
      op === ts.SyntaxKind.ExclamationEqualsToken
    ) {
      let lit = null;
      if (isLocaleExpr(n.left) && strOf(n.right) !== null) lit = strOf(n.right);
      else if (isLocaleExpr(n.right) && strOf(n.left) !== null) lit = strOf(n.left);
      if (lit === null || !LOCALES.has(lit)) return undefined;
      const eq = lit === "en";
      return op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken ? eq : !eq;
    }
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.AmpersandAmpersandToken) {
      const a = evalCond(n.left);
      const b = evalCond(n.right);
      if (op === ts.SyntaxKind.BarBarToken) {
        if (a === true || b === true) return true;
        if (a === false && b === false) return false;
      } else {
        if (a === false || b === false) return false;
        if (a === true && b === true) return true;
      }
      return undefined;
    }
  }
  return undefined;
}

const needsParens = (n) =>
  ts.isBinaryExpression(n) ||
  ts.isConditionalExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isYieldExpression(n) ||
  ts.isAsExpression(n);

function propKey(p) {
  if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) return null;
  const nm = p.name;
  if (ts.isIdentifier(nm)) return nm.text;
  if (ts.isStringLiteral(nm)) return nm.text;
  return null;
}

function collectEdits(sf, src) {
  const edits = [];
  const visit = (node) => {
    if (ts.isConditionalExpression(node)) {
      const v = evalCond(node.condition);
      if (v !== undefined) {
        const branch = v ? node.whenTrue : node.whenFalse;
        let text = src.slice(branch.getStart(sf), branch.end);
        const parent = node.parent;
        const wrap =
          needsParens(branch) &&
          !(ts.isJsxExpression(parent) || ts.isParenthesizedExpression(parent) || ts.isReturnStatement(parent) ||
            ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isCallExpression(parent) ||
            ts.isArrowFunction(parent) || ts.isArrayLiteralExpression(parent) || ts.isTemplateSpan(parent));
        if (wrap) text = `(${text})`;
        edits.push({ start: node.getStart(sf), end: node.end, text });
        return; // re-run in next pass for nested
      }
    }
    if (ts.isIfStatement(node)) {
      const v = evalCond(node.expression);
      if (v !== undefined) {
        const branch = v ? node.thenStatement : node.elseStatement;
        let text = "";
        if (branch) {
          if (ts.isBlock(branch)) {
            const hasDecl = branch.statements.some(
              (s) =>
                ts.isVariableStatement(s) || ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s)
            );
            text = hasDecl ? src.slice(branch.getStart(sf), branch.end) : branch.statements.map((s) => src.slice(s.getFullStart(), s.end)).join("").replace(/^\s*\n/, "");
          } else {
            text = src.slice(branch.getStart(sf), branch.end);
          }
        }
        edits.push({ start: node.getFullStart() + (src.slice(node.getFullStart(), node.getStart(sf)).match(/^\s*/)?.[0].length ?? 0), end: node.end, text });
        return;
      }
    }
    if (ts.isObjectLiteralExpression(node)) {
      const props = node.properties;
      const keys = props.map(propKey);
      const locKeys = keys.filter((k) => k && LOCALES.has(k));
      if (locKeys.length >= 2 && locKeys.includes("en") && locKeys.length >= props.length - 2) {
        props.forEach((p, i) => {
          const k = keys[i];
          if (k && LOCALES.has(k) && k !== "en") {
            const next = src.slice(p.end).match(/^\s*,/);
            const end = next ? p.end + next[0].length : p.end;
            edits.push({ start: p.getFullStart(), end, text: "" });
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return edits;
}

/** Remove statements that can never run because an earlier sibling returns/throws. */
function collectUnreachable(sf, src) {
  const edits = [];
  const keep = (s) =>
    ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isEnumDeclaration(s);
  const visit = (node) => {
    if (ts.isBlock(node) || ts.isSourceFile(node)) {
      const st = node.statements;
      const idx = st.findIndex((s) => ts.isReturnStatement(s) || ts.isThrowStatement(s));
      if (idx >= 0 && idx < st.length - 1) {
        for (const s of st.slice(idx + 1)) {
          if (!keep(s)) edits.push({ start: s.getFullStart(), end: s.end, text: "" });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return edits;
}

function applyEdits(src, edits) {
  // drop edits nested in an earlier (outer) one, then apply back-to-front
  edits.sort((a, b) => a.start - b.start || b.end - a.end);
  const top = [];
  let lastEnd = -1;
  for (const e of edits) {
    if (e.start >= lastEnd) {
      top.push(e);
      lastEnd = e.end;
    }
  }
  let out = src;
  for (const e of top.reverse()) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

function processFile(file) {
  let src = fs.readFileSync(file, "utf8");
  const original = src;
  for (let pass = 0; pass < 6; pass++) {
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    let edits = collectEdits(sf, src);
    if (!edits.length && (src !== original || process.env.UNREACHABLE)) edits = collectUnreachable(sf, src);
    if (!edits.length) break;
    const next = applyEdits(src, edits);
    if (next === src) break;
    src = next;
  }
  if (src !== original) {
    fs.writeFileSync(file, src, "utf8");
    return true;
  }
  return false;
}

function walk(p, out = []) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const n of fs.readdirSync(p)) {
      if (n === "node_modules" || n === ".next") continue;
      walk(path.join(p, n), out);
    }
  } else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  return out;
}

let changed = 0;
for (const arg of process.argv.slice(2)) {
  for (const f of walk(path.resolve(arg))) {
    if (processFile(f)) {
      changed++;
      console.log("stripped", path.relative(process.cwd(), f));
    }
  }
}
console.log(`strip-locale-branches: ${changed} files changed`);

