import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getEffectiveBroadcastRole,
  listPermissionsForRole,
} from "@/lib/live-broadcast/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const { channelId } = await params;
  const role = await getEffectiveBroadcastRole(channelId, session.user.id);
  const permissions = listPermissionsForRole(role);

  return NextResponse.json({
    ok: true,
    role,
    permissions,
    canModerate: permissions.some((p) => p.startsWith("chat.")),
    canManageRoles: permissions.some((p) => p.startsWith("roles.")),
    canEditBroadcast: permissions.includes("broadcast.edit"),
  });
}
