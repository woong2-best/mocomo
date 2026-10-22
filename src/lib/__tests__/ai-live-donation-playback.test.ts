import test from "node:test";
import assert from "node:assert/strict";
import { mocoDonationPlayMs } from "@/lib/ai-live/donation-playback";
import { isAlwaysOnLiveChannel, isMocoOfficialChannel } from "@/lib/ai-live/official-channel-id";
import { idolById, playableIdolVrmUrl } from "@/lib/ai-live/idols";

test("video donations stay up for their paid length and effects are short", () => {
  assert.equal(mocoDonationPlayMs({ type: "SFX" }), 4500);
  assert.equal(mocoDonationPlayMs({ type: "VIDEO", segmentPlaySec: 12, maxPlaySec: 60 }), 12800);
  assert.equal(mocoDonationPlayMs({ type: "VIDEO", segmentPlaySec: null, maxPlaySec: 30 }), 30800);
  assert.equal(mocoDonationPlayMs({ type: "VIDEO", segmentPlaySec: 999, maxPlaySec: 60 }), 180800);
});

test("official and idol channels stay on, and other rooms do not", () => {
  assert.equal(isMocoOfficialChannel("moco-official"), true);
  assert.equal(isMocoOfficialChannel("other"), false);
  assert.equal(isAlwaysOnLiveChannel("moco-official"), true);
  assert.equal(isAlwaysOnLiveChannel("idol-airi"), true);
  assert.equal(isAlwaysOnLiveChannel("idol-chloe"), true);
  assert.equal(isAlwaysOnLiveChannel("idol-stella"), true);
  assert.equal(isAlwaysOnLiveChannel("other"), false);
  assert.equal(idolById("airi")?.vrmUrl, "/models/airi.vrm");
  assert.equal(playableIdolVrmUrl("/models/airi.vrm"), "/models/airi.vrm");
  assert.equal(playableIdolVrmUrl("/models/chloe.vrm"), "/models/chloe.vrm");
  assert.equal(playableIdolVrmUrl("/models/stella.vrm"), "/models/stella.vrm");
  assert.equal(playableIdolVrmUrl("/models/missing.vrm"), "/avatars/default.vrm");
  assert.equal(idolById("nope"), null);
});
