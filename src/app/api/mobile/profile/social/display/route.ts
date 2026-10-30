import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { profileUserCacheTag } from "@/lib/cache-tags";
import { setProfileSocialDisplayed } from "@/lib/profile-social";

const bodySchema = z.object({
  provider: z.enum(["facebook", "instagram", "twitter", "discord", "naver", "tiktok"]),
  displayed: z.boolean(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-profile-social-display", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await setProfileSocialDisplayed(auth.user.id, parsed.data.provider, parsed.data.displayed);
  revalidatePath(`/u/${auth.user.username}`);
  revalidateTag(profileUserCacheTag(auth.user.username));
  return NextResponse.json({ ok: true });
}
