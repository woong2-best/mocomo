import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCachedSession } from "@/lib/auth";

const bodySchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["android", "ios"]),
});

export async function POST(req: NextRequest) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token format." }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  await db.mobilePushToken.upsert({
    where: {
      userId_token: { userId: session.user.id, token },
    },
    create: {
      userId: session.user.id,
      token,
      platform,
    },
    update: { platform, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    await db.mobilePushToken.deleteMany({ where: { userId: session.user.id } });
    return NextResponse.json({ ok: true });
  }

  await db.mobilePushToken.deleteMany({
    where: { userId: session.user.id, token },
  });
  return NextResponse.json({ ok: true });
}
