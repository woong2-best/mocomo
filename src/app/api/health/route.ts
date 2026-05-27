import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyInternalSecret, isProduction } from "@/lib/api-security";

export async function GET(req: NextRequest) {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json(
      { status: dbOk ? "ok" : "degraded" },
      { status: dbOk ? 200 : 503 }
    );
  }

  let voiceCallTable = false;
  if (dbOk) {
    try {
      await db.$queryRaw`SELECT 1 FROM "VoiceCall" LIMIT 1`;
      voiceCallTable = true;
    } catch {
      voiceCallTable = false;
    }
  }

  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    service: "mocomo",
    db: dbOk ? "connected" : "disconnected",
    calls: { voiceCallTable },
  });
}
