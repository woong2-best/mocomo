import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createLivekitToken } from "@/lib/livekit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "room required" }, { status: 400 });
  }

  const token = await createLivekitToken(
    room,
    session.user.id,
    session.user.username || session.user.name || session.user.id
  );

  if (!token) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 503 });
  }

  return NextResponse.json({
    token,
    serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL,
  });
}
