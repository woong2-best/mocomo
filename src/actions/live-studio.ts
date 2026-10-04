"use server";

import { revalidatePath } from "next/cache";
import type { BroadcastRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  assignStreamerStaff,
  banStreamerViewer,
  getStreamerStudioSettings,
  listStreamerChatBans,
  listStreamerStaff,
  removeStreamerStaff,
  searchUsersForStreamerStudio,
  unbanStreamerViewer,
  updateStreamerStudioSettings,
  type StudioSettingsInput,
} from "@/lib/live-broadcast/streamer-studio";

export async function getLiveStudioSettings() {
  const user = await requireAuth();
  return getStreamerStudioSettings(user.id);
}

export async function updateLiveStudioSettings(data: StudioSettingsInput) {
  const user = await requireAuth();
  await updateStreamerStudioSettings(user.id, data);
  revalidatePath("/live/studio");
  revalidatePath("/live/schedule");
  revalidatePath(`/u/${user.username}`);
  return { success: true as const };
}

export async function listLiveStudioBansAction() {
  const user = await requireAuth();
  return listStreamerChatBans(user.id);
}

export async function banLiveStudioViewerAction(targetUserId: string, reason?: string) {
  const user = await requireAuth();
  return banStreamerViewer({
    hostUserId: user.id,
    actorId: user.id,
    targetUserId,
    reason,
  });
}

export async function unbanLiveStudioViewerAction(targetUserId: string) {
  const user = await requireAuth();
  return unbanStreamerViewer({
    hostUserId: user.id,
    actorId: user.id,
    targetUserId,
  });
}

export async function listLiveStudioStaffAction() {
  const user = await requireAuth();
  return listStreamerStaff(user.id);
}

export async function searchLiveStudioUsersAction(query: string) {
  const user = await requireAuth();
  return searchUsersForStreamerStudio(user.id, user.id, query);
}

export async function assignLiveStudioStaffAction(
  targetUserId: string,
  role: BroadcastRole = "MANAGER"
) {
  const user = await requireAuth();
  return assignStreamerStaff({
    hostUserId: user.id,
    actorId: user.id,
    targetUserId,
    role: "MANAGER",
  });
}

export async function removeLiveStudioStaffAction(targetUserId: string) {
  const user = await requireAuth();
  return removeStreamerStaff({
    hostUserId: user.id,
    actorId: user.id,
    targetUserId,
  });
}
