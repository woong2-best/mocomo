/**
 * Which src files belong to which migration batch.
 *   node scripts/i18n/batches.mjs <batch> [--all]   -> writes .build-tmp/i18n/<batch>/files.txt (files with Hangul)
 * Batches: 1 (live/wallet/feed/used/settings/auth/market), 2 (everything else), 3a (seeds + countries, direct),
 *          3b (admin), 4 (legal).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const HANGUL = /[\uAC00-\uD7A3]/;
const n = (p) => p.replace(/\\/g, "/");

const LEGAL = /^src\/lib\/(legal-content|seller-legal)\.ts$/;
const ADMIN = /(^|\/)admin(\/|-)|\/admin\.|^src\/lib\/admin\//;
const SEEDS =
  /^src\/lib\/(i18n\/countries|world-countries|korea-regions|subculture-event-countries|human-challenge-bank|human-challenge-i18n|anime-wiki-seeds|anime-wiki-infobox|anime-title-catalog|anime-genres-i18n|subculture-[a-z-]*seeds[a-z-]*|subculture-event-venues-master|subculture-event-global-config|subculture-commerce\/catalog|virtual-avatar\/(presets|avatar-catalog)|diorama[a-z-]*|report-reasons|live-categories-i18n|community-labels|apick\/bank-catalog)/;

const B1_DIRS = /^src\/(components|app)\/(live|wallet|feed|used|settings|auth|market|star-market|payments|flower|voice-live|voice)\//;
const B1_LIB =
  /^src\/lib\/(live|wallet|feed|used|settings|auth|market|moco|gems\/|flower\/|settlement-moco\/|stripe|payment|mobile-(signup|google|native|oauth)|oauth|creator-subscription-checkout|creator-dm-marketing|goods-shop|api-mobile-auth|api-post-auth|published-toast-store|chat-used|human-challenge\.ts|human-challenge-types)/;
const B1_ACTIONS = /^src\/actions\/(auth|marketplace|used|wallet|live|moco|gem|flower|checkout|payment|settings|monetization|star)/;
const B1_HOOKS = /^src\/hooks\/use-(live|obs|chzzk|market|used|wallet)/;

export function batchOf(rel) {
  rel = n(rel);
  if (LEGAL.test(rel)) return "4";
  if (ADMIN.test(rel)) return "3b";
  if (SEEDS.test(rel)) return "3a";
  if (B1_DIRS.test(rel) || B1_LIB.test(rel) || B1_ACTIONS.test(rel) || B1_HOOKS.test(rel)) return "1";
  return "2";
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

if (process.argv[1] && n(process.argv[1]).endsWith("scripts/i18n/batches.mjs")) {
  const want = process.argv[2];
  const files = walk(path.join(root, "src"))
    .map((f) => n(path.relative(root, f)))
    .filter((f) => batchOf(f) === want && HANGUL.test(fs.readFileSync(path.join(root, f), "utf8")));
  const dir = path.join(root, ".build-tmp", "i18n", want);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "files.txt"), files.join("\n") + "\n");
  console.log(`batch ${want}: ${files.length} files with Hangul -> ${n(path.relative(root, path.join(dir, "files.txt")))}`);
}
