import test from "node:test";
import assert from "node:assert/strict";
import {
  CLUMP_ZOOM_STEP,
  geoCentroid,
  itemsNearScreenPoint,
  nextClumpZoom,
} from "@/lib/maps/pin-clump";

test("clump zoom steps in halfway, not all the way to max", () => {
  assert.equal(nextClumpZoom(4, 19), 4 + CLUMP_ZOOM_STEP);
  assert.ok(nextClumpZoom(4, 19) < 10);
  assert.equal(nextClumpZoom(18.5, 19), 19);
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
