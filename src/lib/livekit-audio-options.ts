import { AudioPresets, type AudioCaptureOptions, type RoomOptions } from "livekit-client";

/** DM·1:1 음성 통화용 마이크 캡처 (에코·노이즈·AGC) */
export const VOICE_CALL_CAPTURE: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48_000,
};

/** 기본 speech(24kbps)보다 높은 음질 · DTX 끔(끊김 방지) */
export const VOICE_CALL_ROOM_OPTIONS: RoomOptions = {
  audioCaptureDefaults: VOICE_CALL_CAPTURE,
  publishDefaults: {
    audioPreset: AudioPresets.musicHighQuality,
    dtx: false,
    red: true,
  },
  dynacast: true,
};
