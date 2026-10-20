import { NextResponse } from "next/server";
import { getCachedHomeChrome } from "@/lib/home-chrome";

export const dynamic = "force-dynamic";

/** Public shell backgrounds. Null means the built-in /public/home file. */
export async function GET() {
  try {
    const data = await getCachedHomeChrome();
    return NextResponse.json(
      { sidebarImageUrl: data.sidebarImageUrl, heroImageUrl: data.heroImageUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
