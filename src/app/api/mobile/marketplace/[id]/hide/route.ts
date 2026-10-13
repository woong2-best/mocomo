import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { setMobileUsedListingHidden } from "@/lib/used-market-mobile";
import { z } from "zod";

const bodySchema = z.object({
  hidden: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-hide", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

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

  const result = await setMobileUsedListingHidden(auth.user.id, id, parsed.data.hidden);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }
  return NextResponse.json(result);
}
