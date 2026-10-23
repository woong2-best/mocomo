import test from "node:test";
import assert from "node:assert/strict";
import {
  isCommentGifPlaybackUrl,
  isCommentPhotoUrl,
  isTenorMediaUrl,
  parseCommentMediaInput,
  serializeCommentMedia,
} from "@/lib/comment-media";

test("Tenor hosts are the only GIF URLs we store", () => {
  assert.equal(isTenorMediaUrl("https://media.tenor.com/abc/tinygif.gif"), true);
  assert.equal(isTenorMediaUrl("https://c.tenor.com/abc/mp4"), true);
  assert.equal(isTenorMediaUrl("https://evil.example/tenor.gif"), false);
  assert.equal(isTenorMediaUrl("http://media.tenor.com/abc.gif"), false);
});

test("comment photos stay on our storage", () => {
  assert.equal(
    isCommentPhotoUrl("https://wijmhtyuhhdupddtlcdh.supabase.co/storage/v1/object/public/mocomo-uploads/image/x.jpg"),
    true,
  );
  assert.equal(isCommentPhotoUrl("/uploads/image/x.jpg"), true);
  assert.equal(isCommentPhotoUrl("https://media.tenor.com/abc.gif"), false);
});

test("a comment needs text or one attachment", () => {
  assert.equal(parseCommentMediaInput({ content: "" }).ok, false);
  assert.equal(parseCommentMediaInput({ content: "hi" }).ok, true);
  const gif = parseCommentMediaInput({
    content: "",
    mediaType: "GIF",
    mediaUrl: "https://media.tenor.com/abc/tinygif.gif",
  });
  assert.equal(gif.ok, true);
  if (gif.ok) {
    assert.equal(gif.mediaType, "GIF");
    assert.equal(gif.content, "");
  }
  const bad = parseCommentMediaInput({
    content: "",
    mediaType: "PHOTO",
    mediaUrl: "https://media.tenor.com/abc.gif",
  });
  assert.equal(bad.ok, false);
});

test("empty media serializes as NONE", () => {
  assert.deepEqual(serializeCommentMedia({}), { mediaType: "NONE", mediaUrl: null });
  assert.deepEqual(serializeCommentMedia({ mediaType: "PHOTO", mediaUrl: "https://mocomo.net/uploads/x.jpg" }), {
    mediaType: "PHOTO",
    mediaUrl: "https://mocomo.net/uploads/x.jpg",
  });
});

test("mp4 Tenor URLs play as video", () => {
  assert.equal(isCommentGifPlaybackUrl("https://media.tenor.com/abc/mp4"), true);
  assert.equal(isCommentGifPlaybackUrl("https://media.tenor.com/abc/tinygif.gif"), false);
});
