import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { srsWebhookSecret } from "@/lib/srs";
import { findLiveChannelByObsStreamKey } from "@/lib/user-obs-stream-key";

type SrsHookBody = {
  action?: string;
  app?: string;
  stream?: string;
  param?: string;
};

/** SRS http_hooks — on_publish / on_unpublish (0=허용, 非0=거부) */
export async function POST(req: NextRequest) {
  const secret = srsWebhookSecret();
  if (secret) {
    const header = req.headers.get("x-srs-secret") ?? req.headers.get("authorization");
    if (header !== secret && header !== `Bearer ${secret}`) {
      return new NextResponse("1", { status: 403 });
    }
  }

  let body: SrsHookBody = {};
  try {
    body = (await req.json()) as SrsHookBody;
  } catch {
    return new NextResponse("1", { status: 400 });
  }

  const action = body.action ?? "";
  const stream = (body.stream ?? "").trim();
  if (!stream || body.app !== "live") {
    return new NextResponse(action === "on_publish" ? "1" : "0");
  }

  if (action === "on_publish") {
    const live = await findLiveChannelByObsStreamKey(stream);
    if (!live) {
      return new NextResponse("1", { status: 200 });
    }
    try {
      await db.voiceChannel.update({
        where: { id: live.id },
        data: { liveStatus: "LIVE", rtmpStreamKey: stream },
      });
    } catch {
      /* ignore */
    }
    return new NextResponse("0", { status: 200 });
  }

  if (action === "on_unpublish") {
    return new NextResponse("0", { status: 200 });
  }

  return new NextResponse("0", { status: 200 });
}
