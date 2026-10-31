import test from "node:test";
import assert from "node:assert/strict";
import {
  commentGifDisplayUrl,
  isCommentGifPlaybackUrl,
  isCommentGifUrl,
  isCommentPhotoUrl,
  isGiphyMediaUrl,
  isTenorMediaUrl,
  parseCommentMediaInput,
  serializeCommentMedia,
} from "@/lib/comment-media";

test("Giphy and legacy Tenor hosts are the only GIF URLs we store", () => {
  assert.equal(isGiphyMediaUrl("https://media.giphy.com/media/abc/giphy.webp"), true);
  assert.equal(isGiphyMediaUrl("https://media2.giphy.com/media/abc/giphy.mp4"), true);
  assert.equal(isGiphyMediaUrl("https://i.giphy.com/abc.webp"), true);
  assert.equal(isGiphyMediaUrl("https://evil.example/giphy.gif"), false);
  assert.equal(isGiphyMediaUrl("http://media.giphy.com/abc.gif"), false);
  assert.equal(isTenorMediaUrl("https://media.tenor.com/abc/tinygif.gif"), true);
  assert.equal(isCommentGifUrl("https://media.giphy.com/media/abc/giphy.mp4"), true);
  assert.equal(isCommentGifUrl("https://c.tenor.com/abc/mp4"), true);
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
    mediaUrl: "https://media.giphy.com/media/abc/giphy.webp",
    mediaMeta: {
      title: "happy, dance",
      user: { username: "studio", display_name: "Studio", avatar_url: "" },
    },
  });
  assert.equal(gif.ok, true);
  if (gif.ok) {
    assert.equal(gif.mediaType, "GIF");
    assert.equal(gif.content, "");
    assert.equal(gif.mediaMeta?.user?.username, "studio");
    assert.equal(gif.mediaMeta?.title, "happy, dance");
  }
  const bad = parseCommentMediaInput({
    content: "",
    mediaType: "PHOTO",
    mediaUrl: "https://media.tenor.com/abc.gif",
  });
  assert.equal(bad.ok, false);
});

test("empty media serializes as NONE", () => {
  assert.deepEqual(serializeCommentMedia({}), { mediaType: "NONE", mediaUrl: null, mediaMeta: null });
  assert.deepEqual(serializeCommentMedia({ mediaType: "PHOTO", mediaUrl: "https://mocomo.net/uploads/x.jpg" }), {
    mediaType: "PHOTO",
    mediaUrl: "https://mocomo.net/uploads/x.jpg",
    mediaMeta: null,
  });
});

test("mp4 GIF URLs play as video", () => {
  assert.equal(isCommentGifPlaybackUrl("https://media.giphy.com/media/abc/giphy.mp4"), true);
  assert.equal(isCommentGifPlaybackUrl("https://media.tenor.com/abc/mp4"), true);
  assert.equal(isCommentGifPlaybackUrl("https://media.giphy.com/media/abc/giphy.webp"), false);
});

test("Giphy MP4 comments display as WebP", () => {
  assert.equal(
    commentGifDisplayUrl("https://media3.giphy.com/media/abc/giphy.mp4"),
    "https://media3.giphy.com/media/abc/giphy.webp",
  );
  assert.equal(
    commentGifDisplayUrl("https://media.giphy.com/media/abc/giphy.webp"),
    "https://media.giphy.com/media/abc/giphy.webp",
  );
  assert.equal(
    commentGifDisplayUrl("https://media.tenor.com/abc/mp4"),
    "https://media.tenor.com/abc/mp4",
  );
});
