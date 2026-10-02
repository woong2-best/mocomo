import test from "node:test";
import assert from "node:assert/strict";
import { errorText } from "@/lib/i18n/error-text";
import { ERROR_CODES, isPhoneVerificationError } from "@/lib/error-codes";

test("errorText resolves a catalog code to English", () => {
  assert.equal(
    errorText(ERROR_CODES.usedRegionUnavailable),
    "The used marketplace is unavailable in your region."
  );
});

test("errorText passes already-translated text through unchanged", () => {
  const translated = errorText(ERROR_CODES.usedRegionUnavailable);
  assert.equal(errorText(translated), translated);
  assert.equal(errorText(errorText(errorText(ERROR_CODES.authRequired))), "You need to sign in.");
});

test("errorText leaves text with placeholders or braces alone", () => {
  assert.equal(errorText("Enter at least {v0} CP."), "Enter at least {v0} CP.");
  assert.equal(errorText("Stripe says: {\"code\":\"x\"}"), "Stripe says: {\"code\":\"x\"}");
});

test("errorText tolerates empty and non-string input", () => {
  assert.equal(errorText(""), "");
  assert.equal(errorText(null), "");
  assert.equal(errorText(undefined), "");
  assert.equal(errorText(42), "");
});

test("errorText does not resolve Object.prototype names", () => {
  assert.equal(errorText("constructor"), "constructor");
  assert.equal(errorText("toString"), "toString");
});

test("error code predicates compare codes, not message text", () => {
  assert.equal(isPhoneVerificationError(ERROR_CODES.usedPhoneVerificationRequired), true);
  assert.equal(isPhoneVerificationError(errorText(ERROR_CODES.usedPhoneVerificationRequired)), false);
});
