import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!key) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({ configured: true, publicKey: key });
}
