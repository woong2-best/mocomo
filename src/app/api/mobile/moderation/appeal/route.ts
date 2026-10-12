import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { submitAppealForUser } from "@/lib/operator-sanctions";

const schema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(20).max(5000),
  contactEmail: z.string().email(),
  sanctionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-moderation-appeal", 10);
  if (limited) return limited;
  const auth = await requireMobileApiUser(req, { writeKind: "appeal" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the appeal form." }, { status: 400 });
  }

  const result = await submitAppealForUser({ userId: auth.user.id, ...parsed.data });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
