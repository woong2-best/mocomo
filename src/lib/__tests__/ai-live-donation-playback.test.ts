import test from "node:test";
import assert from "node:assert/strict";
import { mocoDonationPlayMs } from "@/lib/ai-live/donation-playback";
import { isMocoOfficialChannel } from "@/lib/ai-live/official-channel-id";

test("video donations stay up for their paid length and effects are short", () => {
  assert.equal(mocoDonationPlayMs({ type: "SFX" }), 4500);
  assert.equal(mocoDonationPlayMs({ type: "VIDEO", segmentPlaySec: 12, maxPlaySec: 60 }), 12800);
  assert.equal(mocoDonationPlayMs({ type: "VIDEO", segmentPlaySec: null, maxPlaySec: 30 }), 30800);
  assert.equal(mocoDonationPlayMs({ type: "VIDEO", segmentPlaySec: 999, maxPlaySec: 60 }), 180800);
});

test("only the official channel id is the always-on host", () => {
  assert.equal(isMocoOfficialChannel("moco-official"), true);
  assert.equal(isMocoOfficialChannel("other"), false);
});
