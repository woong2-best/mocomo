import test from "node:test";
import assert from "node:assert/strict";
import {
  mintStreamingOAuthState,
  safeStreamingReturnTo,
  verifyStreamingOAuthState,
} from "@/lib/streaming-accounts/oauth-state";

test("safeStreamingReturnTo rejects open redirects", () => {
  assert.equal(safeStreamingReturnTo("/settings/profile"), "/settings/profile");
  assert.equal(
    safeStreamingReturnTo("/auth/mobile/social-connected"),
    "/auth/mobile/social-connected"
  );
  assert.equal(safeStreamingReturnTo("https://evil.example"), "/settings/streaming-accounts");
});

test("More Connect Moment OAuth state opts into profile icons", () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-oauth-state";
  const state = mintStreamingOAuthState("user-1", "YOUTUBE", {
    returnTo: "/settings/profile",
    showOnProfile: true,
  });
  assert.deepEqual(verifyStreamingOAuthState(state, "YOUTUBE"), {
    userId: "user-1",
    returnTo: "/settings/profile",
    showOnProfile: true,
  });
});

test("Live Studio OAuth state does not opt into profile icons", () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-oauth-state";
  const state = mintStreamingOAuthState("user-1", "TWITCH");
  assert.deepEqual(verifyStreamingOAuthState(state, "TWITCH"), {
    userId: "user-1",
    returnTo: "/settings/streaming-accounts",
    showOnProfile: false,
  });
});
