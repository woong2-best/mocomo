import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, "users-lookup", 60);
  if (limited) return limited;

  const username = req.nextUrl.searchParams.get("username")?.replace("@", "").trim();
  if (!username || username.length > 20) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(user);
}
