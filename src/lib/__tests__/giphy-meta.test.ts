import test from "node:test";
import assert from "node:assert/strict";
import {
  gifTitleKeywords,
  giphyCreatorQuery,
  parseCommentGifMeta,
  parseGiphyCreator,
} from "@/lib/giphy-meta";

test("official GIPHY creators keep username, display name, and avatar", () => {
  const user = parseGiphyCreator({
    username: "moco_studio",
    display_name: "MoCo Studio",
    avatar_url: "https://media.giphy.com/avatars/moco_studio/face.gif",
  });
  assert.deepEqual(user, {
    username: "moco_studio",
    displayName: "MoCo Studio",
    avatarUrl: "https://media.giphy.com/avatars/moco_studio/face.gif",
  });
});

test("anonymous GIPHY rows and unsafe avatars fall back to null", () => {
  assert.equal(parseGiphyCreator(null), null);
  assert.equal(parseGiphyCreator({ username: "bad name" }), null);
  const user = parseGiphyCreator({
    username: "anon",
    display_name: "Anon",
    avatar_url: "https://evil.example/avatar.gif",
  });
  assert.deepEqual(user, { username: "anon", displayName: "Anon", avatarUrl: null });
});

test("comment GIF meta only stores a sanitized GIPHY payload", () => {
  const meta = parseCommentGifMeta({
    source: "ignore-me",
    id: "abc123",
    title: "Happy Dance GIF by Studio",
    user: { username: "studio", display_name: "Studio", avatar_url: "" },
    extra: true,
  });
  assert.deepEqual(meta, {
    source: "giphy",
    id: "abc123",
    title: "Happy Dance GIF by Studio",
    user: { username: "studio", displayName: "Studio", avatarUrl: null },
  });
  assert.equal(parseCommentGifMeta({ title: "" }), null);
});

test("title keywords become hashtag chips when no creator exists", () => {
  assert.deepEqual(gifTitleKeywords("happy, dance, celebration"), ["happy", "dance", "celebration"]);
  assert.deepEqual(gifTitleKeywords("Happy Dance GIF by Artist"), ["Happy Dance"]);
  assert.deepEqual(gifTitleKeywords("Cat / Funny / Reaction"), ["Cat", "Funny", "Reaction"]);
});

test("creator search uses the q=@username form", () => {
  assert.equal(giphyCreatorQuery("studio"), "@studio");
  assert.equal(giphyCreatorQuery("@studio"), "@studio");
});
