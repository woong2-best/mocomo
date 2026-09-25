import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  approveFollowRequestForUser,
  listIncomingFollowRequestsForUser,
  rejectFollowRequestForUser,
} from "@/lib/follow-request-service";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-follow-requests", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const requests = await listIncomingFollowRequestsForUser(auth.user.id);
  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        username: r.user.username,
        name: r.user.name,
        image: r.user.image,
        bio: r.user.bio,
      },
    })),
  });
}

const bodySchema = z.object({
  requesterId: z.string().min(1).max(64),
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-follow-requests-act", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "요청을 확인해 주세요." }, { status: 400 });
  }

  const result =
    parsed.data.action === "approve"
      ? await approveFollowRequestForUser(auth.user.id, parsed.data.requesterId)
      : await rejectFollowRequestForUser(auth.user.id, parsed.data.requesterId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
