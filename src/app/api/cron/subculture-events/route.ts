import { NextRequest, NextResponse } from "next/server";

import { syncSubcultureEventsIfDue } from "@/lib/subculture-events";



/** 공식 시드 반영 + 좌표 보강 (Vercel 일 1회 + 트래픽 시 1시간 주기) */

export async function GET(req: NextRequest) {

  const auth = req.headers.get("authorization");

  const secret = process.env.CRON_SECRET?.trim();

  if (secret && auth !== `Bearer ${secret}`) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  try {

    const { synced, geocoded } = await syncSubcultureEventsIfDue({

      force: true,

      geocodeMax: 12,

    });

    return NextResponse.json({ ok: true, synced, geocoded });

  } catch (e) {

    console.error("[cron/subculture-events]", e);

    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });

  }

}

