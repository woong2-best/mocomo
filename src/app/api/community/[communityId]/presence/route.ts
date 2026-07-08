import { NextResponse } from "next/server";
import { updateCommunityPresence } from "@/actions/community-server";
import type { CommunityPresenceStatus } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ communityId: string }> }
) {
  const { communityId } = await params;
  const body = await req.json().catch(() => ({}));
  const presence = body.presence as CommunityPresenceStatus;
  if (!["ONLINE", "IDLE", "DND", "OFFLINE"].includes(presence)) {
    return NextResponse.json({ error: "Invalid presence" }, { status: 400 });
  }
  const result = await updateCommunityPresence(communityId, presence);
  if ("error" in result) return NextResponse.json(result, { status: 403 });
  return NextResponse.json(result);
}
