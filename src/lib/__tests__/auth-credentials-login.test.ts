import test from "node:test";
import assert from "node:assert/strict";
import { credentialsNeedEmailVerification } from "@/lib/auth-credentials";
import { loginErrorMessage } from "@/lib/auth-login-errors";

test("username-only accounts do not need email verification", () => {
  assert.equal(
    credentialsNeedEmailVerification({ email: null, emailVerified: null }),
    false
  );
  assert.equal(
    credentialsNeedEmailVerification({ email: "", emailVerified: null }),
    false
  );
  assert.equal(
    credentialsNeedEmailVerification({ email: "   ", emailVerified: null }),
    false
  );
});

test("an unverified mailbox still has to be confirmed", () => {
  assert.equal(
    credentialsNeedEmailVerification({
      email: "user@example.com",
      emailVerified: null,
    }),
    true
  );
});

test("a verified mailbox is not asked again", () => {
  assert.equal(
    credentialsNeedEmailVerification({
      email: "user@example.com",
      emailVerified: new Date("2026-01-01"),
    }),
    false
  );
});

test("invalid credentials copy mentions ID", () => {
  assert.match(loginErrorMessage("invalid_credentials"), /ID/i);
});
