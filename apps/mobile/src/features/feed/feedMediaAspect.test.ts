import test from "node:test";
import assert from "node:assert/strict";
import {
  feedMediaFrame,
  feedMediaGridLayout,
  feedMediaNativeAspect,
} from "./feedMediaAspect";

test("feedMediaNativeAspect keeps 9:16 instead of stretching", () => {
  assert.equal(feedMediaNativeAspect(1080, 1920), 1080 / 1920);
});

test("single portrait frame shrinks width so the ratio stays intact", () => {
  const frame = feedMediaFrame(360, 800, 1080, 1920, "IMAGE");
  assert.equal(frame.contain, false);
  assert.ok(frame.width < 360);
  assert.ok(Math.abs(frame.width / frame.height - 1080 / 1920) < 0.02);
});

test("single landscape frame uses the full column at the real ratio", () => {
  const frame = feedMediaFrame(360, 800, 1920, 1080, "IMAGE");
  assert.equal(frame.width, 360);
  assert.ok(Math.abs(frame.width / frame.height - 1920 / 1080) < 0.02);
});

test("two-up grid splits left/right equally", () => {
  const grid = feedMediaGridLayout(360, 800, 2);
  assert.equal(grid.cells.length, 2);
  assert.equal(grid.overflow, 0);
  assert.equal(grid.cells[0]!.x, 0);
  assert.equal(grid.cells[1]!.x + grid.cells[1]!.width, grid.width);
  assert.equal(grid.cells[0]!.width + 2 + grid.cells[1]!.width, grid.width);
  assert.equal(grid.cells[0]!.height, grid.cells[1]!.height);
});

test("three-up grid is one tall left cell and two stacked right cells", () => {
  const grid = feedMediaGridLayout(360, 800, 3);
  assert.equal(grid.cells.length, 3);
  assert.equal(grid.cells[0]!.height, grid.height);
  assert.equal(grid.cells[1]!.y, 0);
  assert.ok(grid.cells[2]!.y > grid.cells[1]!.y);
});

test("four-plus grid is 2x2 and keeps overflow for the +N badge", () => {
  const grid = feedMediaGridLayout(360, 800, 6);
  assert.equal(grid.cells.length, 4);
  assert.equal(grid.overflow, 2);
});
