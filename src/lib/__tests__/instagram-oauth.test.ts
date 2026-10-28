import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInstagramAuthorizeUrl,
  mintInstagramOAuthState,
  verifyInstagramOAuthState,
} from "@/lib/instagram-oauth";

test("Instagram OAuth state is provider-scoped", () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret-for-instagram-oauth";
  const state = mintInstagramOAuthState({ returnTo: "/settings" });
  const verified = verifyInstagramOAuthState(state);
  assert.equal("error" in verified, false);
  if ("error" in verified) return;
  assert.equal(verified.provider, "instagram");
});

test("buildInstagramAuthorizeUrl uses Instagram App ID and instagram.com", () => {
  process.env.INSTAGRAM_APP_ID = "1740911480329423";
  process.env.INSTAGRAM_APP_SECRET = "test-secret";
  const url = new URL(buildInstagramAuthorizeUrl("state.token"));
  assert.equal(url.origin, "https://www.instagram.com");
  assert.equal(url.pathname, "/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "1740911480329423");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://mocomo.net/api/auth/instagram/callback"
  );
  assert.equal(url.searchParams.get("scope"), "instagram_business_basic");
});
