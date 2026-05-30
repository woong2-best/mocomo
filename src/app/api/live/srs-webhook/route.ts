import { NextRequest, NextResponse } from "next/server";
import { srsWebhookSecret } from "@/lib/srs";
import { onSrsPublish, onSrsUnpublish } from "@/lib/live-broadcast/ingest-coordinator";

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
    const result = await onSrsPublish(stream);
    return new NextResponse(result.allowed ? "0" : "1", { status: 200 });
  }

  if (action === "on_unpublish") {
    await onSrsUnpublish(stream);
    return new NextResponse("0", { status: 200 });
  }

  return new NextResponse("0", { status: 200 });
}
