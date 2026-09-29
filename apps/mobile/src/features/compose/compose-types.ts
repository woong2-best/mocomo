import { uiText } from "@/i18n/ui-text";

export function getPollDurationOptions(locale?: string) {
  return [
    { label: uiText(locale, "5분", "5 min"), minutes: 5 },
    { label: uiText(locale, "30분", "30 min"), minutes: 30 },
    { label: uiText(locale, "1시간", "1 hour"), minutes: 60 },
    { label: uiText(locale, "6시간", "6 hours"), minutes: 360 },
    { label: uiText(locale, "12시간", "12 hours"), minutes: 720 },
    { label: uiText(locale, "1일", "1 day"), minutes: 1440 },
    { label: uiText(locale, "3일", "3 days"), minutes: 4320 },
    { label: uiText(locale, "7일", "7 days"), minutes: 10080 },
  ] as const;
}

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
  /** 0–1 relative to image bounds (not letterbox margins) */
  x: number;
  y: number;
  scale: number;
  /** Hex fill — defaults to white when omitted */
  color?: string;
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

export function validatePollDraft(poll: PollDraft, locale?: string): string | null {
  const opts = poll.options.map((o) => o.trim()).filter(Boolean);
  if (opts.length < 2) {
    return uiText(locale, "투표 선택지는 2개 이상 필요합니다.", "Add at least 2 poll options.");
  }
  if (opts.length > 4) {
    return uiText(locale, "투표 선택지는 최대 4개까지입니다.", "You can add up to 4 poll options.");
  }
  if (opts.some((o) => o.length > 50)) {
    return uiText(locale, "선택지는 50자 이내로 입력해 주세요.", "Each option must be 50 characters or fewer.");
  }
  const unique = new Set(opts.map((o) => o.toLowerCase()));
  if (unique.size !== opts.length) {
    return uiText(locale, "선택지 내용이 중복되면 안 됩니다.", "Poll options must be unique.");
  }
  const allowed = getPollDurationOptions(locale).map((d) => d.minutes);
  if (!allowed.includes(poll.durationMinutes as (typeof allowed)[number])) {
    return uiText(locale, "투표 마감 시간이 올바르지 않습니다.", "Invalid poll duration.");
  }
  return null;
}
