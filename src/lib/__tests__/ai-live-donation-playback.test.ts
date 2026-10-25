import test from "node:test";
import assert from "node:assert/strict";
import { mocoDonationPlayMs } from "@/lib/ai-live/donation-playback";
import {
  AVATAR_ACCOUNTS,
  avatarWatchPath,
  avatarWatchPathForChannel,
  isAlwaysOnLiveChannel,
  isMocoOfficialChannel,
} from "@/lib/ai-live/official-channel-id";
import { mergeAvatarPublicProfiles, profileImageForLiveAvatar } from "@/lib/ai-live/avatar-profile-shared";
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
  assert.equal(idolById("nangnang")?.vrmUrl, "/models/nangnang.vrm");
  assert.equal(idolById("stella")?.vrmUrl, "/models/nangnang.vrm");
  assert.equal(playableIdolVrmUrl("/models/airi.vrm"), "/models/airi.vrm");
  assert.equal(playableIdolVrmUrl("/models/chloe.vrm"), "/models/chloe.vrm");
  assert.equal(playableIdolVrmUrl("/models/nangnang.vrm"), "/models/nangnang.vrm");
  assert.equal(playableIdolVrmUrl("/avatars/zelie.vrm"), "/avatars/zelie.vrm");
  assert.equal(playableIdolVrmUrl("/models/missing.vrm"), null);
  assert.equal(playableIdolVrmUrl("blob:https://mocomo.net/preview"), "blob:https://mocomo.net/preview");
  assert.equal(playableIdolVrmUrl("/avatars/default.vrm"), null);
  assert.equal(
    playableIdolVrmUrl("https://xyz.supabase.co/storage/v1/object/public/mocomo-uploads/model/u/live-vrm-zelie.vrm"),
    "https://xyz.supabase.co/storage/v1/object/public/mocomo-uploads/model/u/live-vrm-zelie.vrm",
  );
  assert.equal(idolById("nope"), null);
  assert.deepEqual(
    AVATAR_ACCOUNTS.map((row) => row.username),
    ["zelie", "cleo", "mio", "nangnang"]
  );
  assert.equal(idolById("cleo")?.username, "cleo");
  assert.equal(idolById("mio")?.username, "mio");
  assert.equal(idolById("nangnang")?.username, "nangnang");
  assert.equal(avatarWatchPath("mio"), "/live/mio");
  assert.equal(avatarWatchPathForChannel("idol-chloe"), "/live/mio");
  assert.equal(avatarWatchPathForChannel("someone-else"), null);
});

test("avatar tiles follow the real user profile, not the hardcoded poster name", () => {
  const profiles = mergeAvatarPublicProfiles(
    AVATAR_ACCOUNTS,
    [
      { id: "u-mio", username: "mio", name: "Mio", image: "https://cdn.example/mio.png" },
      { id: "u-cleo", username: "cleo", name: "Cleo", image: null },
    ],
    new Map([["idol-chloe", "u-mio"], ["idol-airi", "u-cleo"]])
  );
  assert.equal(profiles.mio.username, "mio");
  assert.equal(profiles.mio.image, "https://cdn.example/mio.png");
  assert.equal(profiles.cleo.username, "cleo");
  assert.equal(profiles.cleo.image, null);
  assert.equal(profiles.zelie.username, "zelie");
  assert.equal(profiles.nangnang.username, "nangnang");
  assert.equal(profileImageForLiveAvatar("/live/idols/airi.jpg"), null);
  assert.equal(profileImageForLiveAvatar("/live/moco-poster.png"), null);
  assert.equal(profileImageForLiveAvatar("https://cdn.example/cleo.png"), "https://cdn.example/cleo.png");
});
