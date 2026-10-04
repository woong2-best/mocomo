import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { LiveStreamCategory } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  getStreamerStudioSettings,
  updateStreamerStudioSettings,
} from "@/lib/live-broadcast/streamer-studio";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const settings = await getStreamerStudioSettings(auth.user.id);
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-save", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let body: {
    defaultCategory?: LiveStreamCategory | null;
    announcement?: string;
    bio?: string;
    scheduleNote?: string;
    scheduleWeekdays?: number[];
    scheduleTime?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await updateStreamerStudioSettings(auth.user.id, {
    defaultCategory: body.defaultCategory,
    announcement: typeof body.announcement === "string" ? body.announcement : undefined,
    bio: typeof body.bio === "string" ? body.bio : undefined,
    scheduleNote: typeof body.scheduleNote === "string" ? body.scheduleNote : undefined,
    scheduleWeekdays: Array.isArray(body.scheduleWeekdays) ? body.scheduleWeekdays : undefined,
    scheduleTime: body.scheduleTime,
  });

  revalidatePath("/live/studio");
  revalidatePath("/live/schedule");
  revalidatePath(`/u/${auth.user.username}`);
  return NextResponse.json({ success: true });
}
