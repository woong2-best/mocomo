import test from "node:test";
import assert from "node:assert/strict";
import { wikiCoverDisplayUrl } from "@/lib/wiki-cover-url";

test("wikiCoverDisplayUrl upgrades MAL default posters to the large file", () => {
  assert.equal(
    wikiCoverDisplayUrl("https://cdn.myanimelist.net/images/anime/1015/138006.jpg"),
    "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg"
  );
  assert.equal(
    wikiCoverDisplayUrl("https://cdn.myanimelist.net/images/anime/1015/138006t.jpg"),
    "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg"
  );
  assert.equal(
    wikiCoverDisplayUrl("https://cdn.myanimelist.net/images/anime/1015/138006l.webp"),
    "https://cdn.myanimelist.net/images/anime/1015/138006l.webp"
  );
});

test("wikiCoverDisplayUrl upgrades Kitsu and Anilist medium files", () => {
  assert.equal(
    wikiCoverDisplayUrl("https://media.kitsu.io/anime/poster_images/12/small.jpg"),
    "https://media.kitsu.io/anime/poster_images/12/original.jpg"
  );
  assert.equal(
    wikiCoverDisplayUrl("https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-xxx.jpg"),
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-xxx.jpg"
  );
});

test("wikiCoverDisplayUrl leaves already-full and unknown URLs alone", () => {
  assert.equal(wikiCoverDisplayUrl(null), null);
  assert.equal(wikiCoverDisplayUrl("  "), null);
  const uploaded = "https://mocomo.net/uploads/wiki/frieren.webp";
  assert.equal(wikiCoverDisplayUrl(uploaded), uploaded);
});
