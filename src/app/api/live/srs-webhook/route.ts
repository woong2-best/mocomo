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
  let authOk = true;
  if (secret) {
    const header = req.headers.get("x-srs-secret") ?? req.headers.get("authorization");
    authOk = header === secret || header === `Bearer ${secret}`;
    if (!authOk) {
      console.warn("[srs-webhook] secret mismatch — RTMP는 허용, LIVE 동기화만 건너뜀");
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
    if (authOk) {
      void onSrsPublish(stream).catch((e) => console.error("[srs-webhook] on_publish", stream, e));
    }
    return new NextResponse("0", { status: 200 });
  }

  if (action === "on_unpublish") {
    if (authOk) {
      await onSrsUnpublish(stream);
    }
    return new NextResponse("0", { status: 200 });
  }

  return new NextResponse("0", { status: 200 });
}
