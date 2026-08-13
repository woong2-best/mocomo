import { NextResponse } from "next/server";

/** Emoticon shop removed — letter donations via live / DM */
export async function GET() {
  return NextResponse.json({ items: [] });
}
