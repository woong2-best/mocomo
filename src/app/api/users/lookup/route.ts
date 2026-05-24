import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.replace("@", "");
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }
  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(user);
}
