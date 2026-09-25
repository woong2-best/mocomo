import test from "node:test";
import assert from "node:assert/strict";
import { getConversationMeta, groupMemberDisplayNames } from "@/lib/chat-display";

function member(userId: string, username: string, name?: string | null) {
  return {
    userId,
    user: { id: userId, username, image: null, name: name ?? null },
  };
}

test("groupMemberDisplayNames joins other members, not the viewer", () => {
  const members = [
    member("me", "me"),
    member("a", "alice", "앨리스"),
    member("b", "bob"),
  ];
  assert.equal(groupMemberDisplayNames(members, "me"), "앨리스, bob");
});

test("groupMemberDisplayNames truncates after three names", () => {
  const members = [
    member("me", "me"),
    member("a", "a"),
    member("b", "b"),
    member("c", "c"),
    member("d", "d"),
  ];
  assert.equal(groupMemberDisplayNames(members, "me"), "a, b, c 외 1명");
});

test("getConversationMeta uses member names for GROUP rooms", () => {
  const meta = getConversationMeta(
    {
      id: "r1",
      type: "GROUP",
      name: null,
      members: [member("me", "me"), member("a", "alice", "앨리스"), member("b", "bob")],
      messages: [],
    },
    "me"
  );
  assert.equal(meta.displayName, "앨리스, bob");
  assert.equal(meta.profileUsername, undefined);
  assert.equal(meta.otherUserId, undefined);
});
