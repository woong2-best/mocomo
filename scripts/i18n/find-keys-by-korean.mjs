/**
 * Find catalog keys whose original Korean text contained a phrase (from the pre-fill en.json TODO values
 * and main's ko.json). Writes UTF-8 to .build-tmp/keys-by-korean.txt.
 * Usage: node scripts/i18n/find-keys-by-korean.mjs <baseRef> 휴대폰 인증 …
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [baseRef, ...phrases] = process.argv.slice(2);
const show = (ref, p) => {
  try {
    return JSON.parse(execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 }));
  } catch {
    return {};
  }
};
const base = show(baseRef, "src/lib/i18n/locales/en.json");
const ko = show("main", "src/lib/i18n/locales/ko.json");
const now = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));

const korean = {};
for (const [k, v] of Object.entries(base)) {
  if (String(v).startsWith("[TODO translate]")) korean[k] = String(v).replace(/^\[TODO translate\]\s*/, "");
}
for (const [k, v] of Object.entries(ko)) korean[k] ??= String(v);

const out = [];
for (const phrase of phrases) {
  out.push(`## ${phrase}`);
  for (const [k, v] of Object.entries(korean)) {
    if (v.includes(phrase) && k in now) out.push(`${k}\t${v}\t${now[k]}`);
  }
}
fs.writeFileSync(".build-tmp/keys-by-korean.txt", out.join("\n"), "utf8");
console.log(`${out.length - phrases.length} matches`);
