import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getContactSettings, saveContactSettings } from "@/lib/contact-audience";

const audience = z.enum(["EVERYONE", "FOLLOWING_ONLY"]);

const bodySchema = z
  .object({
    messageRequestAudience: audience.optional(),
    callRequestAudience: audience.optional(),
  })
  .refine((value) => value.messageRequestAudience || value.callRequestAudience, {
    message: "Not found.",
  });

/** GET/PUT /api/mobile/me/contact-settings */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const settings = await getContactSettings(auth.user.id);
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `contact-settings:${auth.user.id}`, 30);
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

  const settings = await saveContactSettings(auth.user.id, parsed.data);
  return NextResponse.json(settings);
}
