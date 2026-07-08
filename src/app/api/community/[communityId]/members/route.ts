import { NextResponse } from "next/server";
import { getCommunityMembersForSidebar } from "@/actions/community-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ communityId: string }> }
) {
  const { communityId } = await params;
  const members = await getCommunityMembersForSidebar(communityId);
  return NextResponse.json({ members });
}
