import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCreatorSettlementStatus } from "@/actions/settlement-register";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const status = await getCreatorSettlementStatus();
  return NextResponse.json(status);
}
