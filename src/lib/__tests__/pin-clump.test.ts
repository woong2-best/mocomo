import test from "node:test";
import assert from "node:assert/strict";
import {
  clumpIsSameSpot,
  clumpLngLatBounds,
  geoCentroid,
  itemsNearScreenPoint,
  pileAroundNearest,
} from "@/lib/maps/pin-clump";

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

test("pile is the blob around the nearest pin, not every pin near the click", () => {
  const pins = [
    { id: "daegu-a", x: 100, y: 100 },
    { id: "daegu-b", x: 108, y: 102 },
    { id: "seoul", x: 120, y: 100 },
  ];
  const pile = pileAroundNearest(
    pins,
    (pin) => ({ x: pin.x, y: pin.y }),
    { x: 101, y: 100 },
    16
  );
  assert.deepEqual(
    pile.map((pin) => pin.id),
    ["daegu-a", "daegu-b"]
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

test("clump bounds and same-spot detection", () => {
  const bounds = clumpLngLatBounds([
    { lng: 128.6, lat: 35.87 },
    { lng: 128.61, lat: 35.88 },
  ]);
  assert.deepEqual(bounds, {
    minLng: 128.6,
    minLat: 35.87,
    maxLng: 128.61,
    maxLat: 35.88,
  });
  assert.equal(
    clumpIsSameSpot([
      { lng: 128.6, lat: 35.87 },
      { lng: 128.60005, lat: 35.87005 },
    ]),
    true
  );
  assert.equal(
    clumpIsSameSpot([
      { lng: 128.6, lat: 35.87 },
      { lng: 128.61, lat: 35.88 },
    ]),
    false
  );
});
