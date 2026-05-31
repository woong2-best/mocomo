import {
  AudioPresets,
  type AudioCaptureOptions,
  type RoomOptions,
  type VideoCaptureOptions,
} from "livekit-client";

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

/** DM 영상 통화용 카메라 캡처 (720p 이상 요청) */
export const VIDEO_CALL_CAPTURE: VideoCaptureOptions = {
  facingMode: "user",
  resolution: { width: 1280, height: 720, frameRate: 30 },
};

/** 1:1 영상 통화: 끊김·화질 저하 완화 */
export const VIDEO_CALL_ROOM_OPTIONS: RoomOptions = {
  ...VOICE_CALL_ROOM_OPTIONS,
  disconnectOnPageLeave: false,
  adaptiveStream: false,
  dynacast: false,
  videoCaptureDefaults: VIDEO_CALL_CAPTURE,
  publishDefaults: {
    ...VOICE_CALL_ROOM_OPTIONS.publishDefaults,
    simulcast: false,
    degradationPreference: "maintain-resolution",
    videoEncoding: {
      maxBitrate: 2_500_000,
      maxFramerate: 30,
    },
  },
};

export const VOICE_CALL_STABLE_OPTIONS: RoomOptions = {
  ...VOICE_CALL_ROOM_OPTIONS,
  disconnectOnPageLeave: false,
};

/** 웹 라이브 방송 — 카메라·화면공유·마이크 (OBS 없음) */
export const LIVE_BROADCAST_ROOM_OPTIONS: RoomOptions = {
  ...VIDEO_CALL_ROOM_OPTIONS,
  disconnectOnPageLeave: false,
};
