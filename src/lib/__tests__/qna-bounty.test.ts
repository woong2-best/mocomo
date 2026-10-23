import test from "node:test";
import assert from "node:assert/strict";
import {
  QNA_BOUNTY_DEFAULT_CENTI,
  QNA_BOUNTY_STEP_CENTI,
  formatQnaBountyMoco,
  parseQnaBountyInput,
} from "../qna-bounty";

test("default bounty is 0.02 MOCO", () => {
  assert.equal(QNA_BOUNTY_DEFAULT_CENTI, 2);
  assert.equal(QNA_BOUNTY_STEP_CENTI, 2);
  assert.equal(formatQnaBountyMoco(2), "0.02");
});

test("parseQnaBountyInput allows empty or 0.02 steps", () => {
  assert.equal(parseQnaBountyInput(""), 0);
  assert.equal(parseQnaBountyInput(null), 0);
  assert.equal(parseQnaBountyInput("0.02"), 2);
  assert.equal(parseQnaBountyInput("0.04"), 4);
  assert.equal(parseQnaBountyInput("1"), 100);
  assert.equal(parseQnaBountyInput("0.01"), null);
  assert.equal(parseQnaBountyInput("0.03"), null);
  assert.equal(parseQnaBountyInput("-0.02"), null);
});
