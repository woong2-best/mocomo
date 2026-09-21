"use server";

import { revalidatePath } from "next/cache";
import type { BroadcastRole, LiveStreamCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  assignStreamerStaff,
  banStreamerViewer,
  listStreamerChatBans,
  listStreamerStaff,
  normalizeStudioCategory,
  removeStreamerStaff,
  searchUsersForStreamerStudio,
  unbanStreamerViewer,
} from "@/lib/live-broadcast/streamer-studio";
import {
  normalizeScheduleWeekdays,
  parseScheduleTime,
} from "@/lib/live-broadcast/weekly-schedule";

export async function getLiveStudioSettings() {
  const user = await requireAuth();
  const profile = await db.streamerProfile.findUnique({
    where: { userId: user.id },
  });
  return {
    bio: profile?.bio ?? "",
    announcement: profile?.announcement ?? "",
    scheduleNote: profile?.scheduleNote ?? "",
    scheduleWeekdays: normalizeScheduleWeekdays(profile?.scheduleWeekdays ?? []),
    scheduleTime: profile?.scheduleTime ?? "",
    defaultTitle: profile?.defaultTitle ?? "",
    defaultCategory: (profile?.defaultCategory ?? "JUST_CHATTING") as LiveStreamCategory,
  };
}

export async function updateLiveStudioSettings(data: {
  defaultTitle?: string;
  defaultCategory?: LiveStreamCategory | null;
  announcement?: string;
  bio?: string;
  scheduleNote?: string;
  scheduleWeekdays?: number[];
  scheduleTime?: string | null;
}) {
  const user = await requireAuth();
  const category = normalizeStudioCategory(data.defaultCategory);
  const weekdays =
    data.scheduleWeekdays !== undefined
      ? normalizeScheduleWeekdays(data.scheduleWeekdays)
      : undefined;
  const scheduleTime =
    data.scheduleTime !== undefined ? parseScheduleTime(data.scheduleTime) : undefined;

  await db.streamerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      defaultTitle: data.defaultTitle?.trim().slice(0, 120) || null,
      defaultCategory: category,
      announcement: data.announcement?.trim().slice(0, 500) || null,
      bio: data.bio?.trim().slice(0, 500) || null,
      scheduleNote: data.scheduleNote?.trim().slice(0, 300) || null,
      scheduleWeekdays: weekdays ?? [],
      scheduleTime: scheduleTime ?? null,
    },
    update: {
      ...(data.defaultTitle !== undefined
        ? { defaultTitle: data.defaultTitle.trim().slice(0, 120) || null }
        : {}),
      ...(data.defaultCategory !== undefined ? { defaultCategory: category } : {}),
      ...(data.announcement !== undefined
        ? { announcement: data.announcement.trim().slice(0, 500) || null }
        : {}),
      ...(data.bio !== undefined ? { bio: data.bio.trim().slice(0, 500) || null } : {}),
      ...(data.scheduleNote !== undefined
        ? { scheduleNote: data.scheduleNote.trim().slice(0, 300) || null }
        : {}),
      ...(weekdays !== undefined ? { scheduleWeekdays: weekdays } : {}),
      ...(scheduleTime !== undefined ? { scheduleTime } : {}),
    },
  });

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
