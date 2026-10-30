import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDiscordAuthorizeUrl,
  mintDiscordOAuthState,
  verifyDiscordOAuthState,
} from "@/lib/discord-oauth";

test("Discord OAuth state is signed and provider-scoped", () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret-for-discord-oauth";
  const state = mintDiscordOAuthState("/settings/profile", "user_12345678");
  const verified = verifyDiscordOAuthState(state);
  assert.equal("error" in verified, false);
  if ("error" in verified) return;
  assert.equal(verified.provider, "discord");
  assert.equal(verified.returnTo, "/settings/profile");
  assert.equal(verified.linkUserId, "user_12345678");
});

test("buildDiscordAuthorizeUrl uses identify scope and previous callback", () => {
  process.env.AUTH_DISCORD_ID = "123456789012345678";
  process.env.AUTH_DISCORD_SECRET = "test-secret";
  const url = new URL(buildDiscordAuthorizeUrl("/settings/profile"));
  assert.equal(url.origin, "https://discord.com");
  assert.equal(url.pathname, "/oauth2/authorize");
  assert.equal(url.searchParams.get("client_id"), "123456789012345678");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://mocomo.net/api/auth/callback/discord"
  );
  assert.equal(url.searchParams.get("scope"), "identify");
  assert.equal(url.searchParams.get("response_type"), "code");
});
