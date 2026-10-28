import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInstagramAuthorizeUrl,
  mintInstagramOAuthState,
  normalizeOAuthCode,
  safeInstagramReturnTo,
  verifyInstagramOAuthState,
} from "@/lib/instagram-oauth";

test("normalizeOAuthCode strips Meta's trailing hash marker", () => {
  assert.equal(normalizeOAuthCode("AQBx-hBsH3#_"), "AQBx-hBsH3");
  assert.equal(normalizeOAuthCode("AQBx-hBsH3"), "AQBx-hBsH3");
  assert.equal(normalizeOAuthCode(null), null);
  assert.equal(normalizeOAuthCode("  "), null);
});

test("safeInstagramReturnTo only allows same-origin paths", () => {
  assert.equal(safeInstagramReturnTo("/settings"), "/settings");
  assert.equal(safeInstagramReturnTo("//evil.example"), undefined);
  assert.equal(safeInstagramReturnTo("https://evil.example"), undefined);
  assert.equal(safeInstagramReturnTo(null), undefined);
});

test("Instagram OAuth state is signed and expires-aware", () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret-for-instagram-oauth";
  const state = mintInstagramOAuthState({ returnTo: "/settings", addAccount: true });
  const verified = verifyInstagramOAuthState(state);
  assert.equal("error" in verified, false);
  if ("error" in verified) return;
  assert.equal(verified.returnTo, "/settings");
  assert.equal(verified.addAccount, true);
  assert.equal("error" in verifyInstagramOAuthState("tampered.state"), true);
});

test("buildInstagramAuthorizeUrl includes client id, redirect, and profile scope", () => {
  process.env.INSTAGRAM_CLIENT_ID = "test-instagram-app-id";
  process.env.INSTAGRAM_CLIENT_SECRET = "test-secret";
  process.env.INSTAGRAM_REDIRECT_URI = "https://mocomo.net/api/auth/instagram/callback";
  const url = new URL(buildInstagramAuthorizeUrl("abc.def"));
  assert.equal(url.origin, "https://www.instagram.com");
  assert.equal(url.pathname, "/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "test-instagram-app-id");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://mocomo.net/api/auth/instagram/callback"
  );
  assert.equal(url.searchParams.get("scope"), "instagram_graph_user_profile");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "abc.def");
});
