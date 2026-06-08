import { NextResponse } from "next/server";
import { AVATAR_CATALOG } from "@/lib/virtual-avatar/avatar-catalog";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    version: 1,
    count: AVATAR_CATALOG.length,
    items: AVATAR_CATALOG,
  });
}
