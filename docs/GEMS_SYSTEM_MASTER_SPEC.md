# MoCoMo Gems System Master Spec (v2.0)

> 젬(Gems) 후원 · 환불 · 크리에이터 정산 통합 스펙.  
> 구현 코드: `src/lib/gems/`, `src/actions/gems.ts`, Prisma models in `schema.prisma`.

## Scope

### In-Scope

| Feature | Prisma Model | Notes |
|---------|--------------|-------|
| Profile/post tips | `Tip`, `GiftEvent` | Gem spend + GiftEvent |
| Live tips | `LiveSupportEvent`, `GiftEvent` | Socket.io relay + GiftEvent |
| Paid post media | `PostMediaPurchase`, `GiftEvent` | `source: post_media_purchase` |

### Out-of-Scope (do not modify)

- `MessageAttachmentPurchase` — DM locked media
- `MarketplaceListing`, `MarketplaceOrder` — Star/Open market
- `UsedListing`, `UsedAuctionBid` — P2P used market
- `Subscription` — recurring billing

## Two-Transaction Split

1. **Fan → MoCoMo**: Stripe checkout → `GemPurchase` (funds on platform Stripe balance)
2. **Fan → Creator**: Gem spend → `GiftEvent` only (no money movement)
3. **MoCoMo → Creator**: Cron `processCreatorPayouts()` → Stripe Transfer (batched)

## Refund Policy

| Consumer | Window | Fee |
|----------|--------|-----|
| KR | 30 days | 10% on unused gems |
| Global/US | 14 days | 10% on unused gems |
| Spent gems | — | Non-refundable |

Minimum top-up: **$5.00 USD** (500 gems @ $0.01/gem).

## Creator Payout (Hybrid)

| Net payout (USD) | Method | Stripe fee |
|------------------|--------|------------|
| &lt; $5 | Skip (rollover) | — |
| $5 – $33 | Standard | $0 |
| ≥ $33 | Instant | 1.5% |

Platform margin: **10%** (`PLATFORM_MARGIN_RATE`).

## Database Models

- `GemPurchase` — FIFO `remainingGems`, Stripe PI id
- `GiftEvent` — spend ledger, `payoutBatchId` null = unsettled
- `GiftEventAllocation` — FIFO purchase → event mapping
- `CreatorPayoutBatch` — cron aggregation (no FK to GemPurchase)
- `UnauthorizedPaymentClaim` — stolen card / minor claims

## Core Algorithms

| Function | Module |
|----------|--------|
| `consumeGemsFifo` | `src/lib/gems/fifo.ts` |
| `processRefundRequest` | `src/lib/gems/refund.ts` |
| `processCreatorPayouts` | `src/lib/gems/payout.ts` |
| `spendGemsOnProfileTip` / `Live` / `PostMedia` | `src/lib/gems/spend-bridge.ts` |

## Cron

```
GET /api/cron/creator-gem-payouts
```

Requires `CRON_SECRET` in production (`verifyInternalSecret`).

## Payment UI Legal Copy

```
By clicking 'Pay', you agree to our Terms of Service. Unused Gems can be refunded
within 14 days (30 days for KR residents), subject to a 10% processing fee.
Spent Gems are strictly non-refundable.
```

Constant: `GEM_PURCHASE_TERMS_COPY` in `src/lib/gems/constants.ts`.

## Safety Checklist

- ❌ No FK between `GemPurchase` and `CreatorPayoutBatch`
- ❌ No per-`GiftEvent` Stripe Transfer — batch only
- ❌ Do not modify DM/market/subscription/used models
- ❌ No in-app WebView checkout — external browser (Safari/Chrome)
- ❌ Do not block all refunds for unused gem balance

## Server Actions

| Action | Purpose |
|--------|---------|
| `createGemTopupCheckout` | Stripe GEM_TOPUP checkout |
| `tipWithGems` | Profile tip via gems |
| `liveTipWithGems` | Live tip via gems |
| `purchasePostMediaWithGems` | Paid media via gems |
| `requestGemRefund` | Partial refund unused gems |
| `submitGemUnauthorizedClaim` | Fraud/minor claim |

## Remaining UI Work

- [x] Wallet hub: gem balance, purchase history, refund button
- [x] Checkout sheet: `GemPayOption` for TIP / POST_MEDIA
- [x] Checkout / wallet: `GEM_PURCHASE_TERMS_COPY` checkbox
- [x] Mobile: `Linking.openURL` for gem top-up (no WebView)
- [x] Mobile API: `/api/mobile/gems`
- [x] Cron: `vercel.json` → `/api/cron/creator-gem-payouts` daily 02:00 UTC
