import assert from "node:assert/strict";
import test from "node:test";
import { quoteMocoTopupLedger } from "@/lib/moco/stripe-pass-through";

test("10 MOCO pass-through matches $50 + ~$2.62 PG", () => {
  const q = quoteMocoTopupLedger(10);
  assert.equal(q.basePriceCents, 5000);
  assert.equal(q.grossAmountCents, 5262);
  assert.equal(q.pgFeeCents, 262);
  assert.equal(q.platformRevenueCents, 250);
  assert.equal(q.creatorAllocationCents, 4750);
});
