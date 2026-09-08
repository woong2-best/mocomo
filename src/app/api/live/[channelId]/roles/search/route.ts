import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { searchUsersForBroadcastRole } from "@/lib/live-broadcast/role-service";
import {
  listPermissionsForRole,
  requireBroadcastPermission,
} from "@/lib/live-broadcast/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "live-roles-search", 60);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ ok: true, users: [] });
  }

  const permManage = await requireBroadcastPermission(session.user.id, channelId, "roles.manage");
  const permMod = await requireBroadcastPermission(
    session.user.id,
    channelId,
    "roles.assign_moderator"
  );
  const granted = permManage.ok ? permManage : permMod.ok ? permMod : null;
  if (!granted) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const users = await searchUsersForBroadcastRole(session.user.id, channelId, q);
  const actorRole = granted.role;
  const actorPerms = listPermissionsForRole(actorRole);

  return NextResponse.json({
    ok: true,
    users,
    assignableRoles: actorPerms.includes("roles.manage")
      ? (["MANAGER", "MODERATOR", "VIP"] as const)
      : (["MODERATOR", "VIP"] as const),
  });
}
