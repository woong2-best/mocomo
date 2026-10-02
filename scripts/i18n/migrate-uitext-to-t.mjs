/**
 * Replace uiText(locale, ko, en) and u(ko, en) with t("auto.key") using English string in en.json.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enPath = path.join(root, "src/lib/i18n/locales/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

function slug(enText) {
  return enText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("_")
    .slice(0, 48);
}

function ensureKey(enText, prefix = "ui") {
  for (const [k, v] of Object.entries(en)) {
    if (v === enText) return k;
  }
  let base = `${prefix}.${slug(enText) || "text"}`;
  let key = base;
  let n = 2;
  while (key in en) {
    key = `${base}_${n++}`;
  }
  en[key] = enText;
  return key;
}

const reUiText =
  /uiText\s*\(\s*locale\s*,\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*(?:,\s*(\{[^}]+\}))?\s*\)/g;
const reU =
  /\bu\s*\(\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*(?:,\s*(\{[^}]+\}))?\s*\)/g;

function unescape(s) {
  return s.replace(/\\"/g, '"').replace(/\\n/g, "\n");
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, files);
    } else if (/\.(tsx|ts)$/.test(name)) {
      files.push(p);
    }
  }
  return files;
}

let changedFiles = 0;
for (const file of walk(path.join(root, "src"))) {
  if (file.includes("ui-text")) continue;
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("uiText") && !/\bu\s*\(/.test(src)) continue;

  let modified = src;
  modified = modified.replace(reUiText, (_, ko, enStr, vars) => {
    const key = ensureKey(unescape(enStr));
    return vars ? `t("${key}", ${vars})` : `t("${key}")`;
  });
  modified = modified.replace(reU, (_, ko, enStr, vars) => {
    const key = ensureKey(unescape(enStr));
    return vars ? `t("${key}", ${vars})` : `t("${key}")`;
  });

  if (modified !== src) {
    if (!modified.includes("useLocale") && modified.includes(".t(")) {
      /* caller must already have t */
    }
    modified = modified.replace(
      /import \{ uiText \} from "@\/lib\/i18n\/ui-text";\n?/g,
      ""
    );
    modified = modified.replace(
      /import \{ uiText,([^}]+)\} from "@\/lib\/i18n\/ui-text";\n?/g,
      ""
    );
    modified = modified.replace(/\n  const u = \(ko: string, en: string\) => uiText\(locale, ko, en\);\n/, "\n");
    fs.writeFileSync(file, modified, "utf8");
    changedFiles++;
  }
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
console.log(`Updated ${changedFiles} files; en.json keys: ${Object.keys(en).length}`);
