/**
 * Replace "actions.xxx" catalog keys with their English literal on lines where the text is
 * persisted (DB reason/memo, Stripe metadata) or rendered server-side — not returned as an error code.
 * Targets are file:line pairs verified by hand; a line is skipped if it no longer contains a key.
 */
import fs from "node:fs";

const en = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));

const TARGETS = {
  "src/actions/admin-economy-flags.ts": [71, 92],
  "src/actions/admin-finance.ts": [47, 78, 89],
  "src/actions/admin-stripe-verify.ts": [29, 116],
  "src/actions/admin.ts": [156, 201, 344, 381, 406, 426, 428],
  "src/actions/appeal.ts": [195],
  "src/actions/apt-economy.ts": [186],
  "src/actions/community-hub.ts": [97],
  "src/actions/community-moderation.ts": [131],
  "src/actions/cosplay-board.ts": [194],
  "src/actions/discovery.ts": [206],
  "src/actions/events.ts": [60, 150],
  "src/actions/flower-admin.ts": [55],
  "src/actions/live-stream.ts": [131],
  "src/actions/marketplace-admin.ts": [215],
  "src/actions/marketplace-cart-checkout.ts": [87],
  "src/actions/marketplace-checkout.ts": [379],
  "src/actions/moderation-admin.ts": [428],
  "src/actions/report.ts": [40],
  "src/actions/sponsored-ad.ts": [35],
};

let replaced = 0;
for (const [file, lines] of Object.entries(TARGETS)) {
  const src = fs.readFileSync(file, "utf8").split("\n");
  for (const n of lines) {
    const before = src[n - 1];
    if (before === undefined) continue;
    const after = before.replace(/"(actions\.[\w]+)"/g, (m, key) => {
      if (!(key in en)) return m;
      replaced++;
      return JSON.stringify(en[key]);
    });
    if (after !== before) {
      src[n - 1] = after;
      console.log(`${file}:${n}: ${after.trim()}`);
    } else {
      console.warn(`no key on ${file}:${n}`);
    }
  }
  fs.writeFileSync(file, src.join("\n"), "utf8");
}
console.log(`Inlined ${replaced} keys`);
