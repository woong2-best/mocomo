import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFacebookAuthorizeUrl,
  mintFacebookOAuthState,
  normalizeOAuthCode,
  safeFacebookReturnTo,
  verifyFacebookOAuthState,
} from "@/lib/facebook-oauth";

test("normalizeOAuthCode strips Meta trailing hash marker", () => {
  assert.equal(normalizeOAuthCode("AQBx-hBsH3#_"), "AQBx-hBsH3");
  assert.equal(normalizeOAuthCode(null), null);
});

test("safeFacebookReturnTo only allows same-origin paths", () => {
  assert.equal(safeFacebookReturnTo("/settings"), "/settings");
  assert.equal(safeFacebookReturnTo("//evil.example"), undefined);
});

test("Facebook OAuth state is signed", () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret-for-facebook-oauth";
  const state = mintFacebookOAuthState({ returnTo: "/settings", addAccount: true });
  const verified = verifyFacebookOAuthState(state);
  assert.equal("error" in verified, false);
  if ("error" in verified) return;
  assert.equal(verified.returnTo, "/settings");
  assert.equal(verified.addAccount, true);
});

test("buildFacebookAuthorizeUrl uses Facebook dialog and public_profile scope", () => {
  process.env.FACEBOOK_CLIENT_ID = "1412207774406610";
  process.env.FACEBOOK_CLIENT_SECRET = "test-secret";
  process.env.FACEBOOK_REDIRECT_URI = "https://mocomo.net/api/auth/facebook/callback";
  const url = new URL(buildFacebookAuthorizeUrl("abc.def"));
  assert.equal(url.hostname, "www.facebook.com");
  assert.equal(url.pathname, "/v21.0/dialog/oauth");
  assert.equal(url.searchParams.get("client_id"), "1412207774406610");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://mocomo.net/api/auth/facebook/callback"
  );
  assert.equal(url.searchParams.get("scope"), "public_profile,email");
  assert.equal(url.searchParams.get("response_type"), "code");
});
