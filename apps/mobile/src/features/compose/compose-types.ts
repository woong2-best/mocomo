export const POLL_DURATION_OPTIONS = [
  { label: "5분", minutes: 5 },
  { label: "30분", minutes: 30 },
  { label: "1시간", minutes: 60 },
  { label: "6시간", minutes: 360 },
  { label: "12시간", minutes: 720 },
  { label: "1일", minutes: 1440 },
  { label: "3일", minutes: 4320 },
  { label: "7일", minutes: 10080 },
] as const;

export const DEFAULT_POLL_DURATION_MINUTES = 1440;

export type ImageEditDraft = {
  filterId: string;
  brightness: number;
  contrast: number;
  saturation: number;
  textOverlays: VideoTextOverlay[];
  audioTrack: VideoAudioTrack | null;
};

export const DEFAULT_IMAGE_EDIT: ImageEditDraft = {
  filterId: "none",
  brightness: 0,
  contrast: 0,
  saturation: 0,
  textOverlays: [],
  audioTrack: null,
};

export type VideoTextOverlay = {
  id: string;
  text: string;
  /** 0–1 relative to preview frame */
  x: number;
  y: number;
  scale: number;
};

export type VideoAudioTrack = {
  uri: string;
  filename: string;
  /** Mix volume 0–1 */
  volume: number;
};

export type VideoEditDraft = {
  startSec: number;
  endSec: number;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  filterId: string;
  textOverlays: VideoTextOverlay[];
  audioTrack: VideoAudioTrack | null;
};

export const DEFAULT_VIDEO_EDIT: VideoEditDraft = {
  startSec: 0,
  endSec: 0,
  rotation: 0,
  flipX: false,
  filterId: "none",
  textOverlays: [],
  audioTrack: null,
};

export type LocalMediaDraft = {
  id: string;
  uri: string;
  mime: string;
  filename: string;
  type: "IMAGE" | "VIDEO";
  width?: number;
  height?: number;
  duration?: number;
  videoEdit?: VideoEditDraft;
  imageEdit?: ImageEditDraft;
};

export type PollDraft = {
  options: string[];
  durationMinutes: number;
};

export type CollaboratorDraft = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export function validatePollDraft(poll: PollDraft): string | null {
  const opts = poll.options.map((o) => o.trim()).filter(Boolean);
  if (opts.length < 2) return "투표 선택지는 2개 이상 필요합니다.";
  if (opts.length > 4) return "투표 선택지는 최대 4개까지입니다.";
  if (opts.some((o) => o.length > 50)) return "선택지는 50자 이내로 입력해 주세요.";
  const unique = new Set(opts.map((o) => o.toLowerCase()));
  if (unique.size !== opts.length) return "선택지 내용이 중복되면 안 됩니다.";
  const allowed = POLL_DURATION_OPTIONS.map((d) => d.minutes);
  if (!allowed.includes(poll.durationMinutes as (typeof allowed)[number])) {
    return "투표 마감 시간이 올바르지 않습니다.";
  }
  return null;
}
