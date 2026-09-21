"use server";

import { requireAuth } from "@/lib/auth";

const DISABLED = { error: "단체방 기능이 종료되었습니다." } as const;

/** 코스어 전용 단체방 — 코스어만 개설, 6자리 입장 코드 자동 생성 */
export async function createCosplayerGroupRoom(_name: string) {
  await requireAuth();
  return DISABLED;
}

/** 일반 친목 단체방 — 비밀번호 선택(6자리 자동 또는 직접 입력) / 비밀번호 없이 공개 입장 */
export async function createSocialGroupRoom(_data: {
  name: string;
  usePassword: boolean;
  customPassword?: string;
}) {
  await requireAuth();
  return DISABLED;
}

/** 6자리 코드로 입장 (코스어 방·비밀번호 친목방) */
export async function joinGroupRoomByCode(_code: string) {
  await requireAuth();
  return DISABLED;
}

/** 방 ID + (선택) 비밀번호로 입장 */
export async function joinGroupRoomById(_roomId: string, _password?: string) {
  await requireAuth();
  return DISABLED;
}

export async function getGroupRoomMeta(_roomId: string) {
  await requireAuth();
  return DISABLED;
}

export async function setGroupRoomAnnouncement(_roomId: string, _title: string, _body: string) {
  await requireAuth();
  return DISABLED;
}

export async function createGroupPoll(_roomId: string, _question: string, _options: string[]) {
  await requireAuth();
  return DISABLED;
}

export async function voteGroupPoll(_pollId: string, _optionId: string) {
  await requireAuth();
  return DISABLED;
}

/** 친목 단체방 — 단체 음성 통화 (LiveKit, 멤버 전원 발언 가능) */
export async function startSocialGroupVoiceCall(_roomId: string) {
  await requireAuth();
  return DISABLED;
}

export async function joinSocialGroupVoiceCall(_roomId: string) {
  await requireAuth();
  return DISABLED;
}
