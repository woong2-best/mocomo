import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  getNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notification-settings";

const bodySchema = z
  .object({
    pushNotificationsEnabled: z.boolean().optional(),
    notifyDirectMessages: z.boolean().optional(),
    notifyMentionsReplies: z.boolean().optional(),
    notifyLikesInteractions: z.boolean().optional(),
    notifyGroupMessages: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.pushNotificationsEnabled !== undefined ||
      value.notifyDirectMessages !== undefined ||
      value.notifyMentionsReplies !== undefined ||
      value.notifyLikesInteractions !== undefined ||
      value.notifyGroupMessages !== undefined,
    { message: "Not found." }
  );

/** GET/PUT /api/mobile/me/notification-settings */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const settings = await getNotificationSettings(auth.user.id);
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `notification-settings:${auth.user.id}`, 40);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const settings = await saveNotificationSettings(auth.user.id, parsed.data);
  return NextResponse.json(settings);
}
