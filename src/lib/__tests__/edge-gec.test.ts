import test from "node:test";
import assert from "node:assert/strict";
import { generateSecMsGecV2 } from "@/lib/ai-live/edge-gec";

test("Sec-MS-GEC v2 matches the Python fixture", () => {
  assert.equal(
    generateSecMsGecV2(1700000000),
    "2CD23A2CA0B2595A-F3C846C370E05F9CC83ACC5F995C5F5D87A4D0F14CE8936A0F902E64099E38A2",
  );
});
