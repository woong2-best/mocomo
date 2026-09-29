#!/usr/bin/env node
/**
 * Copies retired-feature source into archive/legacy/snapshots/ (relative paths preserved).
 * Safe to re-run; overwrites snapshot copies only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outRoot = path.join(root, "archive/legacy/snapshots");

const REL_PATHS = [
  "src/lib/used-auction.ts",
  "src/lib/used-auction-lifecycle.ts",
  "src/lib/used-auction-bid-core.ts",
  "src/lib/used-auction-bid-hold.ts",
  "src/lib/used-auction-notify.ts",
  "src/lib/used-auction-marketplace-order.ts",
  "src/lib/used-auction-legal.ts",
  "src/lib/used-auction-config.ts",
  "src/lib/used-auction-trade-complete.ts",
  "src/lib/auction-deposit",
  "src/actions/used-auction.ts",
  "src/actions/used-auction-payment.ts",
  "src/actions/used-auction-negotiation.ts",
  "src/actions/used-auction-bid-hold.ts",
  "src/actions/used-auction-chat.ts",
  "src/components/used/used-auction-panel.tsx",
  "src/components/used/used-auction-bottom-bar.tsx",
  "src/components/used/used-auction-bid-sheet.tsx",
  "src/components/used/used-auction-payment-panel.tsx",
  "src/components/used/used-auction-countdown.tsx",
  "src/components/used/used-auction-bid-history.tsx",
  "src/components/used/used-auction-legal-notice.tsx",
  "src/components/used/used-auction-chat-negotiation.tsx",
  "src/components/used/used-auction-payment-countdown.tsx",
  "src/components/used/used-auction-trade-complete.tsx",
  "src/app/api/cron/used-auctions/route.ts",
  "src/app/api/mobile/marketplace/[id]/bid/route.ts",
  "src/app/api/mobile/marketplace/auction-deposit/route.ts",
  "src/app/api/auction/deposit/status/route.ts",
  "src/lib/creator-dm-marketing.ts",
  "src/actions/creator-dm-marketing.ts",
  "src/components/messages/creator-marketing-dialog.tsx",
  "apps/mobile/src/features/messages/CreatorMarketingSheet.tsx",
  "apps/mobile/src/api/creator-dm-marketing.ts",
  "apps/mobile/src/features/marketplace/AuctionCountdown.tsx",
  "apps/mobile/src/features/marketplace/AuctionWoodScreen.tsx",
  "apps/mobile/src/api/auction-deposit.ts",
];

function copyRecursive(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

let copied = 0;
for (const rel of REL_PATHS) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) {
    console.warn("skip (missing):", rel);
    continue;
  }
  const dest = path.join(outRoot, rel);
  copyRecursive(src, dest);
  copied += 1;
}
console.log(`Snapshot sync done: ${copied} paths → ${path.relative(root, outRoot)}`);
