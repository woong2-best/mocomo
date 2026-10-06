import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateMoneyAge,
  moneyAgeBlockFromRecord,
  MONEY_AGE_CODE_MISSING,
  MONEY_AGE_CODE_UNDERAGE,
  MONEY_MIN_AGE,
} from "@/lib/money-age-policy";

describe("evaluateMoneyAge", () => {
  const now = new Date(2026, 9, 6);

  it("blocks when birth date is missing", () => {
    const status = evaluateMoneyAge(null, now);
    assert.equal(status.allowed, false);
    assert.equal(status.reason, "missing");
    assert.equal(status.hasBirthDate, false);
    assert.equal(moneyAgeBlockFromRecord(null)?.code, MONEY_AGE_CODE_MISSING);
  });

  it("blocks under 18", () => {
    const birth = new Date(2010, 0, 1);
    const status = evaluateMoneyAge(birth, now);
    assert.equal(status.allowed, false);
    assert.equal(status.reason, "underage");
    assert.ok((status.age ?? 0) < MONEY_MIN_AGE);
    assert.equal(moneyAgeBlockFromRecord(birth)?.code, MONEY_AGE_CODE_UNDERAGE);
  });

  it("allows 18 and older", () => {
    const justTurned18 = new Date(2008, 9, 6);
    const status = evaluateMoneyAge(justTurned18, now);
    assert.equal(status.allowed, true);
    assert.equal(status.reason, null);
    assert.equal(status.age, 18);
    assert.equal(moneyAgeBlockFromRecord(justTurned18), null);
  });
});
