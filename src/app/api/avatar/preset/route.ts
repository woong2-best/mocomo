import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AvatarConfig } from "@/lib/virtual-avatar/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const preset = await db.avatarPreset.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ preset });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string; config?: AvatarConfig };
  if (!body.config) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const preset = await db.avatarPreset.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      name: body.name ?? "Default",
      config: body.config as object,
    },
    update: {
      name: body.name ?? "Default",
      config: body.config as object,
    },
  });

  return NextResponse.json({ preset });
}
