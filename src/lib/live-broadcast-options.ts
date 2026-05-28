import {
  AudioPresets,
  type RoomOptions,
  type VideoCaptureOptions,
} from "livekit-client";
import { VOICE_CALL_CAPTURE, VOICE_CALL_ROOM_OPTIONS } from "@/lib/livekit-audio-options";

/** 브라우저 라이브 송출 (통화와 동일 SDK, components-react 미사용) */
export const LIVE_BROWSER_VIDEO_CAPTURE: VideoCaptureOptions = {
  facingMode: "user",
  resolution: { width: 1280, height: 720, frameRate: 30 },
};

export const LIVE_BROADCAST_ROOM_OPTIONS: RoomOptions = {
  ...VOICE_CALL_ROOM_OPTIONS,
  disconnectOnPageLeave: false,
  adaptiveStream: true,
  videoCaptureDefaults: LIVE_BROWSER_VIDEO_CAPTURE,
  publishDefaults: {
    ...VOICE_CALL_ROOM_OPTIONS.publishDefaults,
    videoCodec: "vp8",
  },
};

export const LIVE_VIEWER_ROOM_OPTIONS: RoomOptions = {
  ...VOICE_CALL_ROOM_OPTIONS,
  disconnectOnPageLeave: false,
  adaptiveStream: true,
};

export { VOICE_CALL_CAPTURE as LIVE_BROWSER_AUDIO_CAPTURE };
