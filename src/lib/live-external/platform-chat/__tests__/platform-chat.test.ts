/**
 * Platform chat unit tests — sanitize, merge, IRC parse, overlay token, access helpers.
 * Run: node --import tsx src/lib/live-external/platform-chat/__tests__/platform-chat.test.ts
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  sanitizePlatformChatText,
  sanitizePlatformChatUsername,
} from "../sanitize";
import {
  mergeUnifiedChatMessages,
  platformToUnified,
} from "../merge-messages";
import { parseTwitchIrcPrivmsg } from "../twitch-irc";
import { chzzkChatWsServerId } from "../chzzk-live-chat";
import { overlayChatMeta } from "../../overlay-access";
import {
  mintOverlayToken,
  overlayBroadcastSid,
  verifyOverlayToken,
} from "../../overlay-token";

test("sanitizePlatformChatText strips control chars and caps length", () => {
  assert.equal(sanitizePlatformChatText("  hello\u0007world  "), "helloworld");
  assert.equal(sanitizePlatformChatText("a".repeat(600)).length, 500);
});

test("sanitizePlatformChatUsername trims and caps", () => {
  assert.equal(sanitizePlatformChatUsername("  streamer  "), "streamer");
  assert.equal(sanitizePlatformChatUsername("x".repeat(100)).length, 64);
});

test("mergeUnifiedChatMessages dedupes by id and sorts by time", () => {
  const merged = mergeUnifiedChatMessages([
    [
      { id: "b", username: "b", content: "2", at: 200, source: "MOCOMO" },
      { id: "a", username: "a", content: "1", at: 100, source: "MOCOMO" },
    ],
    [
      { id: "b", username: "b2", content: "dup", at: 250, source: "TWITCH" },
      { id: "c", username: "c", content: "3", at: 150, source: "TWITCH" },
    ],
  ]);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["a", "c", "b"]
  );
  assert.equal(merged.find((m) => m.id === "b")?.content, "2");
});

test("platformToUnified preserves source", () => {
  const rows = platformToUnified([
    {
      id: "youtube:1",
      source: "YOUTUBE",
      username: "u",
      content: "hi",
      at: 1,
      userId: "platform:youtube:u",
    },
  ]);
  assert.equal(rows[0]?.source, "YOUTUBE");
});

test("parseTwitchIrcPrivmsg parses tagged PRIVMSG", () => {
  const line =
    "@badge-info=;display-name=TestUser;id=abc-123 :testuser!testuser@test.tmi.twitch.tv PRIVMSG #mychannel :Hello chat";
  const msg = parseTwitchIrcPrivmsg(line, "mychannel");
  assert.ok(msg);
  assert.equal(msg.id, "twitch:abc-123");
  assert.equal(msg.username, "TestUser");
  assert.equal(msg.content, "Hello chat");
  assert.equal(msg.source, "TWITCH");
});

test("parseTwitchIrcPrivmsg rejects wrong channel", () => {
  const line =
    "@display-name=Other :other!other@test.tmi.twitch.tv PRIVMSG #wrong :nope";
  assert.equal(parseTwitchIrcPrivmsg(line, "mychannel"), null);
});

test("chzzkChatWsServerId is stable for same chatChannelId", () => {
  const a = chzzkChatWsServerId("N2he1k");
  const b = chzzkChatWsServerId("N2he1k");
  assert.equal(a, b);
  assert.ok(a >= 1 && a <= 9);
});

test("overlayChatMeta exposes externalId only for Twitch", () => {
  const base = {
    createdAt: new Date(),
    isLive: true,
    liveStatus: "LIVE",
    broadcastMode: "EXTERNAL",
    mediaSourceType: "EXTERNAL",
    externalChannelId: null,
    connectedStreamingAccountId: null,
  };
  assert.deepEqual(
    overlayChatMeta({
      ...base,
      externalProvider: "TWITCH",
      externalId: "mylogin",
    }),
    { provider: "TWITCH", externalId: "mylogin" }
  );
  assert.deepEqual(
    overlayChatMeta({
      ...base,
      externalProvider: "YOUTUBE",
      externalId: "video123",
    }),
    { provider: "YOUTUBE" }
  );
  assert.equal(
    overlayChatMeta({
      ...base,
      externalProvider: null,
      externalId: null,
    }),
    null
  );
});

test("overlay token mint + verify with broadcastSid", () => {
  process.env.LIVE_OVERLAY_SECRET = "test-overlay-secret-key-32bytes!!";
  const sid = overlayBroadcastSid(new Date("2026-08-26T10:00:00.000Z"));
  const token = mintOverlayToken("ch1", "chat", { broadcastSid: sid });
  assert.ok(token);
  const verified = verifyOverlayToken(token!, { channelId: "ch1", kind: "chat" });
  assert.equal(verified.ok, true);
  if (verified.ok) {
    assert.equal(verified.payload.broadcastSid, sid);
  }
  const wrongChannel = verifyOverlayToken(token!, { channelId: "other", kind: "chat" });
  assert.equal(wrongChannel.ok, false);
});
