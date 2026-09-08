import { NextRequest, NextResponse } from "next/server";
import type { BroadcastRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  assignBroadcastRole,
  listBroadcastRoleLogs,
  listBroadcastRoleMembers,
  removeBroadcastRole,
} from "@/lib/live-broadcast/role-service";
import {
  getEffectiveBroadcastRole,
  listPermissionsForRole,
} from "@/lib/live-broadcast/permissions";

const ASSIGNABLE: BroadcastRole[] = ["MANAGER", "MODERATOR", "VIP"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const role = await getEffectiveBroadcastRole(channelId, session.user.id);
  const perms = listPermissionsForRole(role);
  const canView =
    perms.includes("roles.manage") ||
    perms.includes("roles.assign_moderator") ||
    perms.includes("roles.assign_vip");

  if (!canView) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const [members, logs] = await Promise.all([
    listBroadcastRoleMembers(channelId),
    listBroadcastRoleLogs(channelId, 30),
  ]);

  return NextResponse.json({ ok: true, members, logs, myRole: role, permissions: perms });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "live-roles-assign", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  let body: { targetUserId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const targetUserId = body.targetUserId?.trim();
  const role = body.role?.trim().toUpperCase() as BroadcastRole;
  if (!targetUserId || !ASSIGNABLE.includes(role)) {
    return NextResponse.json({ error: "대상 사용자와 역할이 필요합니다." }, { status: 400 });
  }

  const result = await assignBroadcastRole({
    channelId,
    actorId: session.user.id,
    targetUserId,
    role,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "live-roles-remove", 20);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const targetUserId = req.nextUrl.searchParams.get("targetUserId")?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId가 필요합니다." }, { status: 400 });
  }

  const result = await removeBroadcastRole({
    channelId,
    actorId: session.user.id,
    targetUserId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
