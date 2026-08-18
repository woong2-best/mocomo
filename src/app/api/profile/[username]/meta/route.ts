import { NextRequest, NextResponse } from "next/server";
import { getProfileTabContentMeta } from "@/actions/profile-page";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const meta = await getProfileTabContentMeta(username);
  if (!meta) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(meta, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
