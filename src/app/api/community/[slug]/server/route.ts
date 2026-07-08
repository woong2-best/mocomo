import { NextResponse } from "next/server";
import { getCommunityServerContext } from "@/lib/community-server/server-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ctx = await getCommunityServerContext(slug);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ctx);
}
