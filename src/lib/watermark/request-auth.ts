import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getMobileUserId } from "@/lib/api-mobile-auth";

/** Cookie session (web) or Bearer JWT (mobile app). */
export async function getWatermarkViewerUserId(req: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  return getMobileUserId(req);
}
