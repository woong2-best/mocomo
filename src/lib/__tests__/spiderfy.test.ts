import test from "node:test";
import assert from "node:assert/strict";
import {
  geoCentroid,
  itemsNearScreenPoint,
  spiderfyOffsets,
} from "@/lib/maps/spiderfy";

test("spiderfy offsets fan out around the origin with no pile-up", () => {
  const three = spiderfyOffsets(3);
  assert.equal(three.length, 3);
  for (const offset of three) {
    assert.ok(Math.hypot(offset.x, offset.y) > 20);
  }
  const distances = three.map((offset) => Math.hypot(offset.x, offset.y));
  assert.ok(Math.max(...distances) - Math.min(...distances) < 1e-6);

  const many = spiderfyOffsets(16);
  assert.equal(many.length, 16);
  const unique = new Set(many.map((offset) => `${offset.x.toFixed(2)},${offset.y.toFixed(2)}`));
  assert.equal(unique.size, 16);
});

test("nearby screen hits ignore pins outside the clump", () => {
  const pins = [
    { id: "a", x: 10, y: 10 },
    { id: "b", x: 18, y: 12 },
    { id: "c", x: 200, y: 200 },
  ];
  const hits = itemsNearScreenPoint(
    pins,
    (pin) => ({ x: pin.x, y: pin.y }),
    { x: 12, y: 11 },
    28
  );
  assert.deepEqual(
    hits.map((pin) => pin.id),
    ["a", "b"]
  );
});

test("geo centroid averages the clump", () => {
  assert.deepEqual(
    geoCentroid([
      { lng: 139.7, lat: 35.6 },
      { lng: 139.8, lat: 35.8 },
    ]),
    { lng: 139.75, lat: 35.7 }
  );
});
