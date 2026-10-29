import test from "node:test";
import assert from "node:assert/strict";
import {
  extractHashtagNamesLoose,
  hasMeaningfulPostCaption,
  splitPostCaptionAndHashtags,
  splitReelOverlayCaption,
} from "@/lib/post-hashtags";

test("rejects a post that is only a spaced hashtag", () => {
  assert.equal(hasMeaningfulPostCaption("# rhru"), false);
  assert.deepEqual(extractHashtagNamesLoose("# rhru"), ["rhru"]);
});

test("rejects a post that is only compact hashtags", () => {
  assert.equal(hasMeaningfulPostCaption("#foo #bar"), false);
  assert.equal(hasMeaningfulPostCaption("  #안녕  #태그  "), false);
  assert.equal(hasMeaningfulPostCaption("#"), false);
});

test("keeps real writing and lifts hashtags out", () => {
  const split = splitPostCaptionAndHashtags("오늘 날씨 좋다 #daily #mood");
  assert.equal(split.caption, "오늘 날씨 좋다");
  assert.equal(split.hashtagLine, "#daily #mood");
  assert.equal(hasMeaningfulPostCaption("오늘 날씨 좋다 #daily"), true);
});

test("does not treat C# as a hashtag", () => {
  const split = splitPostCaptionAndHashtags("C# is great");
  assert.equal(split.caption, "C# is great");
  assert.deepEqual(split.hashtags, []);
});

test("reel overlay hides hashtags and description keeps them", () => {
  const parts = splitReelOverlayCaption("제목", "본문이에요 #reel #fun");
  assert.equal(parts.overlay, "제목\n본문이에요");
  assert.equal(parts.hashtagLine, "#reel #fun");
});
