import test from "node:test";
import assert from "node:assert/strict";
import {
  computeReelsChromeLayout,
  isReelsWideViewport,
  REELS_STAGE_ASPECT,
  REELS_WIDE_NAV_ITEMS,
} from "./reels-wide-layout";

test("typical phone portrait stays full-bleed", () => {
  assert.equal(isReelsWideViewport(390, 844), false);
  const layout = computeReelsChromeLayout(390, 844);
  assert.equal(layout.isWide, false);
  assert.equal(layout.stageWidth, 390);
  assert.equal(layout.stageLeft, 0);
  assert.equal(layout.leftRailWidth, 0);
});

test("iPhone SE 9:16 class stays full-bleed", () => {
  assert.equal(isReelsWideViewport(375, 667), false);
  const layout = computeReelsChromeLayout(375, 667);
  assert.equal(layout.isWide, false);
  assert.equal(layout.stageWidth, 375);
});

test("Z Fold unfolded portrait centers a 9:16 stage", () => {
  const layout = computeReelsChromeLayout(1812, 2176);
  assert.equal(layout.isWide, true);
  assert.equal(layout.stageWidth, Math.round(2176 * REELS_STAGE_ASPECT));
  assert.equal(layout.stageLeft + layout.stageWidth + layout.rightRailWidth, 1812);
  assert.ok(layout.leftRailWidth >= 64);
  assert.ok(layout.rightRailWidth >= 64);
  assert.ok(Math.abs(layout.stageWidth / layout.stageHeight - REELS_STAGE_ASPECT) < 0.01);
});

test("tablet portrait uses side rails", () => {
  const layout = computeReelsChromeLayout(820, 1180);
  assert.equal(layout.isWide, true);
  assert.ok(layout.stageWidth < 820);
  assert.equal(layout.leftRailWidth + layout.stageWidth + layout.rightRailWidth, 820);
});

test("landscape phone gets a centered stage and rails", () => {
  const layout = computeReelsChromeLayout(844, 390);
  assert.equal(layout.isWide, true);
  assert.equal(layout.stageWidth, Math.round(390 * REELS_STAGE_ASPECT));
  assert.ok(layout.leftRailWidth > 200);
});

test("tight leftover shrinks the stage so both rails stay tappable", () => {
  // Aspect just over the wide threshold, leftover < 128.
  const height = 1000;
  const width = Math.round(height * (9 / 16 + 0.05));
  const layout = computeReelsChromeLayout(width, height);
  assert.equal(layout.isWide, true);
  assert.ok(layout.leftRailWidth >= 64);
  assert.ok(layout.rightRailWidth >= 64);
  assert.equal(layout.leftRailWidth + layout.stageWidth + layout.rightRailWidth, width);
});

test("wide nav uses the same six app destinations as the drawer", () => {
  assert.deepEqual(
    REELS_WIDE_NAV_ITEMS.map((item) => item.route),
    ["Home", "Used", "StarList", "CommunityList", "AnimeList", "Wallet"]
  );
  assert.deepEqual(
    REELS_WIDE_NAV_ITEMS.map((item) => item.icon),
    ["home-outline", "cart-outline", "star-outline", "people-outline", "book-outline", "wallet-outline"]
  );
});
