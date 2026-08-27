import type { CommunityPermissionKey } from "@/lib/community-server/types";
import { PERMISSION_LABELS } from "@/lib/community-server/permissions";

/** 채널 override UI에 노출할 권한 (채널 행동 관련) */
export const CHANNEL_OVERRIDE_PERMISSION_KEYS: CommunityPermissionKey[] = [
  "sendMessages",
  "createPosts",
  "createComments",
  "attachFiles",
  "connectVoice",
  "speakVoice",
  "useVideo",
  "shareScreen",
  "moderateChat",
  "announce",
];

export function channelOverrideLabel(key: CommunityPermissionKey): string {
  return PERMISSION_LABELS[key] ?? key;
}
