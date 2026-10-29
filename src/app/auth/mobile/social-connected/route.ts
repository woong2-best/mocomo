import { NextResponse } from "next/server";

const DEEP_LINK = "mocomo://oauth?social=1";

export function GET() {
  return NextResponse.redirect(DEEP_LINK);
}
