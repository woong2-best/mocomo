
import { translate } from "@/i18n/runtime";
export function getPollDurationOptions(locale?: string) {
  return [
    { label: translate("m.compose.5_min"), minutes: 5 },
    { label: translate("m.compose.30_min"), minutes: 30 },
    { label: translate("m.compose.1_hour"), minutes: 60 },
    { label: translate("m.compose.6_hours"), minutes: 360 },
    { label: translate("m.compose.12_hours"), minutes: 720 },
    { label: translate("m.compose.1_day"), minutes: 1440 },
    { label: translate("m.compose.3_days"), minutes: 4320 },
    { label: translate("m.compose.7_days"), minutes: 10080 },
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
    return translate("m.compose.add_at_least_2_poll_options");
  }
  if (opts.length > 4) {
    return translate("m.compose.you_can_add_up_to_4");
  }
  if (opts.some((o) => o.length > 50)) {
    return translate("m.compose.each_option_must_be_50_characters");
  }
  const unique = new Set(opts.map((o) => o.toLowerCase()));
  if (unique.size !== opts.length) {
    return translate("m.compose.poll_options_must_be_unique");
  }
  const allowed = getPollDurationOptions(locale).map((d) => d.minutes);
  if (!allowed.includes(poll.durationMinutes as (typeof allowed)[number])) {
    return translate("m.compose.invalid_poll_duration");
  }
  return null;
}
