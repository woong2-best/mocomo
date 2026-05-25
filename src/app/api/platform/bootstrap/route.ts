import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensurePlatformBootstrap } from "@/lib/platform-bootstrap";

export const runtime = "nodejs";

export async function POST() {
  try {
    await ensurePlatformBootstrap(db);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[platform/bootstrap]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
