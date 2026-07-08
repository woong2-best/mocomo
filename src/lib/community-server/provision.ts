import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { DEFAULT_SERVER_CHANNELS, DEFAULT_SERVER_ROLES } from "./default-channels";
import { defaultPermissionsForRole } from "./permissions";

/** 커뮤니티 생성 시 또는 기존 커뮤니티 최초 진입 시 기본 채널·역할 시드 */
export async function provisionCommunityServer(
  tx: Prisma.TransactionClient,
  communityId: string,
  creatorId: string,
  communityName: string
) {
  const existing = await tx.communityChannel.count({ where: { communityId } });
  if (existing > 0) return;

  const categoryIds = new Map<string, string>();
  const categories = [...new Set(DEFAULT_SERVER_CHANNELS.map((c) => c.category))];
  for (let i = 0; i < categories.length; i++) {
    const cat = await tx.communityChannelCategory.create({
      data: { communityId, name: categories[i], position: i },
      select: { id: true, name: true },
    });
    categoryIds.set(cat.name, cat.id);
  }

  for (const spec of DEFAULT_SERVER_CHANNELS) {
    let chatRoomId: string | undefined;
    let voiceChannelId: string | undefined;

    if (spec.type === "TEXT" || spec.type === "ANNOUNCEMENT" || spec.type === "QA") {
      const room = await tx.chatRoom.create({
        data: {
          name: `${communityName} · ${spec.name}`,
          type: "FANDOM",
          communityId,
          isPublic: true,
          createdById: creatorId,
          members: { create: { userId: creatorId, role: "owner" } },
        },
        select: { id: true },
      });
      chatRoomId = room.id;
    }

    if (spec.type === "VOICE" || spec.type === "VIDEO" || spec.type === "LIVE") {
      const voice = await tx.voiceChannel.create({
        data: {
          name: `${communityName} · ${spec.name}`,
          communityId,
          createdBy: creatorId,
          maxUsers: spec.maxUsers ?? (spec.type === "VIDEO" ? 16 : 50),
          allowCamera: spec.type !== "VOICE",
          allowScreen: spec.type !== "VOICE",
          isLive: spec.type === "LIVE",
          broadcastMode: spec.type === "LIVE" ? "BROWSER" : "VOICE",
        },
        select: { id: true },
      });
      voiceChannelId = voice.id;

      if (spec.type === "LIVE") {
        const liveChat = await tx.chatRoom.create({
          data: {
            name: `${communityName} · 라이브 채팅`,
            type: "FANDOM",
            communityId,
            isPublic: true,
            createdById: creatorId,
            voiceChannelId: voice.id,
            members: { create: { userId: creatorId, role: "owner" } },
          },
          select: { id: true },
        });
        chatRoomId = liveChat.id;
      }
    }

    await tx.communityChannel.create({
      data: {
        communityId,
        categoryId: categoryIds.get(spec.category) ?? null,
        type: spec.type,
        name: spec.name,
        slug: spec.slug,
        position: spec.position,
        isDefault: spec.isDefault ?? false,
        chatRoomId: chatRoomId ?? null,
        voiceChannelId: voiceChannelId ?? null,
        maxUsers: spec.maxUsers ?? null,
      },
    });
  }

  const ownerMember = await tx.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: creatorId } },
    select: { id: true },
  });

  for (const roleSpec of DEFAULT_SERVER_ROLES) {
    const role = await tx.communityRole.create({
      data: {
        communityId,
        name: roleSpec.name,
        type: roleSpec.type,
        color: roleSpec.color,
        position: roleSpec.position,
        isDefault: "isDefault" in roleSpec ? roleSpec.isDefault : false,
        permissions: defaultPermissionsForRole(roleSpec.type),
      },
      select: { id: true, type: true },
    });

    if (role.type === "OWNER" && ownerMember) {
      await tx.communityMemberRole.create({
        data: { memberId: ownerMember.id, roleId: role.id },
      });
    }
  }
}

export async function ensureCommunityServerProvisioned(communityId: string) {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { id: true, name: true, creatorId: true },
  });
  if (!community) return false;

  const count = await db.communityChannel.count({ where: { communityId } });
  if (count > 0) return true;

  await db.$transaction((tx) =>
    provisionCommunityServer(tx, community.id, community.creatorId, community.name)
  );
  return true;
}
