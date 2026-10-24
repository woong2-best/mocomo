import { NextRequest, NextResponse } from "next/server";
import { isProduction, verifyInternalSecret } from "@/lib/api-security";
import { discoverModelsOnce } from "@/lib/ai-live/llm/discover";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (isProduction() && !verifyInternalSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const catalog = await discoverModelsOnce();
    const live = Object.fromEntries(
      Object.entries(catalog.providers).map(([company, state]) => [company, state?.live ?? []]),
    );
    return NextResponse.json({ checkedAt: catalog.checkedAt, live });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "discover failed" },
      { status: 500 },
    );
  }
}
