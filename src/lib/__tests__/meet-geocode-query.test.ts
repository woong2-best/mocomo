import test from "node:test";
import assert from "node:assert/strict";
import { inferUsedRegionFromGeocodeLabel } from "@/lib/korea-regions";
import { normalizePostalQuery, queryIsSpecificLocation } from "@/lib/maps/geocode";

const BUSAN_ROAD = "부산광역시 사하구 낙동대로563번안길";
const BUSAN_BUILDING = `${BUSAN_ROAD} 40-3`;

test("Korean street addresses are searched as a place, not a district fragment", () => {
  assert.equal(queryIsSpecificLocation(BUSAN_ROAD), true);
  assert.equal(queryIsSpecificLocation(BUSAN_BUILDING), true);
  assert.equal(queryIsSpecificLocation("부산광역시 사하구"), true);
  assert.equal(queryIsSpecificLocation("1600 Amphitheatre Parkway, Mountain View, CA"), true);
  assert.equal(queryIsSpecificLocation("강남역"), false);
  assert.equal(queryIsSpecificLocation("스타벅스"), false);
  assert.equal(queryIsSpecificLocation("40-3"), false);
});

test("resolved Busan road label selects Saha-gu", () => {
  const inferred = inferUsedRegionFromGeocodeLabel(
    "낙동대로563번안길, 하단동, 하단2동, 사하구, 부산광역시, 49309, 대한민국"
  );
  assert.deepEqual(inferred, { sidoId: "busan", sigungu: "사하구" });
});

test("postal codes follow the seller country and ignore street numbers", () => {
  assert.equal(normalizePostalQuery("KR", "49309"), "49309");
  assert.equal(normalizePostalQuery("KR", "493 09"), "49309");
  assert.equal(normalizePostalQuery("KR", "40-3"), null);
  assert.equal(normalizePostalQuery("KR", BUSAN_BUILDING), null);
  assert.equal(normalizePostalQuery("US", "10001"), "10001");
  assert.equal(normalizePostalQuery("US", "10001-1234"), "10001-1234");
  assert.equal(normalizePostalQuery("JP", "1000001"), "100-0001");
  assert.equal(normalizePostalQuery("JP", "100-0001"), "100-0001");
  assert.equal(normalizePostalQuery("GB", "sw1a1aa"), "SW1A 1AA");
  assert.equal(normalizePostalQuery("CA", "m5v2t6"), "M5V 2T6");
  assert.equal(normalizePostalQuery("NL", "1012ab"), "1012 AB");
  assert.equal(normalizePostalQuery("BR", "01310100"), "01310-100");
});
