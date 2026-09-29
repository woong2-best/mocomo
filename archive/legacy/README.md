# Retired product features (MoCoMo)

These folders are **snapshots** of code removed from the active product surface (2026-09).
Git history remains the source of truth; copies here make it easy to port auction or creator bulk-DM elsewhere.

## Used auction (중고 경매)

- **Retired:** New auction listings and public auction browse/bid UI.
- **Still in repo (for legacy DB rows):** `src/lib/used-auction*.ts`, cron `/api/cron/used-auctions`, payment flows on detail screens for in-flight auctions.
- **Policy flag:** `src/lib/retired-product-features.ts` → `USED_AUCTION_RETIRED`.

### Key paths (active tree)

| Area | Paths |
|------|--------|
| Core | `src/lib/used-auction.ts`, `used-auction-lifecycle.ts`, `used-auction-bid-*.ts`, `used-auction-notify.ts`, `used-auction-marketplace-order.ts`, `used-auction-legal.ts`, `used-auction-config.ts`, `used-auction-trade-complete.ts` |
| Deposits | `src/lib/auction-deposit/` |
| Actions | `src/actions/used-auction*.ts` |
| UI (web) | `src/components/used/used-auction-*.tsx` |
| API | `src/app/api/mobile/marketplace/[id]/bid/`, `auction-deposit/`, `src/app/api/auction/`, `src/app/api/cron/used-auctions/` |
| Mobile | `apps/mobile/src/features/marketplace/Auction*.tsx`, `AuctionWoodScreen.tsx`, `apps/mobile/src/api/auction-deposit.ts` |

Run `node archive/legacy/sync-snapshots.mjs` to refresh `archive/legacy/snapshots/`.

## Creator bulk DM (팔로워 단체 발송)

- **Retired:** Welcome/bulk marketing DMs to all followers.
- **Policy flag:** `CREATOR_BULK_DM_RETIRED`.

### Key paths

| Area | Paths |
|------|--------|
| Core | `src/lib/creator-dm-marketing.ts` |
| Actions | `src/actions/creator-dm-marketing.ts` |
| UI (web) | `src/components/messages/creator-marketing-dialog.tsx` |
| UI (app) | `apps/mobile/src/features/messages/CreatorMarketingSheet.tsx` |
| API | `src/app/api/mobile/me/creator-dm-marketing/` |

## Group chat creation (단체방 만들기)

- **Retired:** New group rooms (`src/actions/group-chat.ts` returns disabled).
- Page: `src/app/messages/groups/new/` — redirect to `/messages`.
