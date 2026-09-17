"use server";

import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { nsfwViewerSelect, canViewNsfwContent } from "@/lib/nsfw-viewer-access";

/** BirthDate-based R-18 (LIVE category) gate — profile age, not PortOne. */
export async function checkLiveR18Access(): Promise<{
  allowed: boolean;
  loggedIn: boolean;
  hasBirthDate: boolean;
}> {
  const userId = await getAuthUserId();
  if (!userId) {
    return { allowed: false, loggedIn: false, hasBirthDate: false };
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: nsfwViewerSelect,
  });
  return {
    allowed: canViewNsfwContent(user),
    loggedIn: true,
    hasBirthDate: !!user?.birthDate,
  };
}
