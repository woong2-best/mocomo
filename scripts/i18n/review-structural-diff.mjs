/**
 * List changed lines vs a base ref that are NOT plain string→t() swaps.
 * Usage: node scripts/i18n/review-structural-diff.mjs main src/components/wallet [more paths]
 */
import { execFileSync } from "node:child_process";

const [base = "main", ...paths] = process.argv.slice(2);
const diff = execFileSync("git", ["diff", "-U0", base, "--", ...paths], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});

const HANGUL = /[\uAC00-\uD7A3]/;
const BROKEN = /\uFFFD|\?\uFFFD/;
const TRIVIAL = [
  /^\s*$/,
  /^\s*\/\//,
  /^\s*\/?\*/,
  /createTranslator/,
  /^\s*const t = /,
  /^\s*const \{ t \} = useLocale\(\);?$/,
  /import \{ useLocale \}/,
  /getServerTranslator/,
];

function isTrivial(line) {
  const body = line.slice(1);
  if (TRIVIAL.some((re) => re.test(body))) return true;
  if (line.startsWith("-") && (HANGUL.test(body) || BROKEN.test(body))) return true;
  if (line.startsWith("+") && /\bt\(\s*["'`]/.test(body)) return true;
  return false;
}

let file = "";
let printedFile = "";
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) {
    file = line.slice(6);
    continue;
  }
  if (line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) continue;
  if (line.startsWith("@@")) continue;
  if (!(line.startsWith("+") || line.startsWith("-"))) continue;
  if (isTrivial(line)) continue;
  if (printedFile !== file) {
    console.log(`\n## ${file}`);
    printedFile = file;
  }
  console.log(line);
}
