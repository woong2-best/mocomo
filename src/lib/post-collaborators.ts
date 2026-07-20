import type { PostCollaboratorStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/admin/services/settings";
import { isAdminCmsRole } from "@/lib/admin/permissions";
import { userPublicSelect } from "@/lib/user-public-select";
import {
  postCollaboratorsInclude,
  profilePostsOwnedOrCollabWhere,
} from "@/lib/post-collaborator-select";

export { postCollaboratorsInclude, profilePostsOwnedOrCollabWhere };

const ACTIVE_COLLAB_STATUSES: PostCollaboratorStatus[] = [
  "PENDING",
  "ACCEPTED",
];

export async function getCollaboratorSettings() {
  const settings = await getSiteSettings();
  return {
    enabled: settings.collaboratorsEnabled !== false,
    max: Math.min(
      50,
      Math.max(1, Math.floor(settings.maxPostCollaborators || 10))
    ),
  };
}

export function assertPostAuthor(
  post: { authorId: string },
  userId: string
): void {
  if (post.authorId !== userId) {
    throw new CollaboratorError("작성자만 할 수 있는 작업입니다.", 403);
  }
}

export async function canManageCollaborators(
  post: { authorId: string },
  userId: string
): Promise<boolean> {
  if (post.authorId === userId) return true;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return !!user && isAdminCmsRole(user.role);
}

export class CollaboratorError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CollaboratorError";
    this.status = status;
  }
}

async function countActiveSlots(postId: string): Promise<number> {
  return db.postCollaborator.count({
    where: {
      postId,
      status: { in: ACTIVE_COLLAB_STATUSES },
    },
  });
}

/**
 * Invite users as PENDING collaborators. Author (or admin) only.
 * Re-invites DECLINED/LEFT/REMOVED rows back to PENDING.
 */
export async function inviteCollaborators(
  postId: string,
  inviterId: string,
  userIds: string[]
): Promise<{ invited: number }> {
  const { enabled, max } = await getCollaboratorSettings();
  if (!enabled) {
    throw new CollaboratorError("공동작업자 기능이 비활성화되어 있습니다.", 403);
  }

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, title: true },
  });
  if (!post) throw new CollaboratorError("게시물을 찾을 수 없습니다.", 404);

  if (!(await canManageCollaborators(post, inviterId))) {
    throw new CollaboratorError("작성자만 공동작업자를 초대할 수 있습니다.", 403);
  }

  const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new CollaboratorError("초대할 사용자를 선택해 주세요.");
  }
  if (uniqueIds.includes(post.authorId) || uniqueIds.includes(inviterId)) {
    throw new CollaboratorError("작성자 자신은 공동작업자로 초대할 수 없습니다.");
  }

  const users = await db.user.findMany({
    where: {
      id: { in: uniqueIds },
      deletedAt: null,
      isBanned: false,
    },
    select: { id: true },
  });
  if (users.length !== uniqueIds.length) {
    throw new CollaboratorError("일부 사용자를 찾을 수 없습니다.");
  }

  const existing = await db.postCollaborator.findMany({
    where: { postId, userId: { in: uniqueIds } },
    select: { userId: true, status: true },
  });
  const existingByUser = new Map(existing.map((r) => [r.userId, r.status]));

  const alreadyActive = uniqueIds.filter((id) => {
    const s = existingByUser.get(id);
    return s === "PENDING" || s === "ACCEPTED";
  });
  if (alreadyActive.length > 0) {
    throw new CollaboratorError("이미 초대되었거나 공동작업 중인 사용자가 있습니다.");
  }

  const currentActive = await countActiveSlots(postId);
  const newSlots = uniqueIds.filter((id) => {
    const s = existingByUser.get(id);
    return s !== "PENDING" && s !== "ACCEPTED";
  }).length;
  if (currentActive + newSlots > max) {
    throw new CollaboratorError(
      `공동작업자는 최대 ${max}명까지 초대할 수 있습니다.`
    );
  }

  const now = new Date();
  await db.$transaction(
    uniqueIds.map((userId) => {
      const prev = existingByUser.get(userId);
      if (prev) {
        return db.postCollaborator.update({
          where: { postId_userId: { postId, userId } },
          data: {
            status: "PENDING",
            invitedBy: inviterId,
            invitedAt: now,
            acceptedAt: null,
            leftAt: null,
          },
        });
      }
      return db.postCollaborator.create({
        data: {
          postId,
          userId,
          invitedBy: inviterId,
          status: "PENDING",
          invitedAt: now,
        },
      });
    })
  );

  for (const userId of uniqueIds) {
    void import("@/lib/notifications").then(({ notifyPostCollabInvite }) =>
      notifyPostCollabInvite(postId, inviterId, userId, post.title)
    );
  }

  return { invited: uniqueIds.length };
}

export async function acceptCollaboratorInvite(
  postId: string,
  userId: string
): Promise<void> {
  const row = await db.postCollaborator.findUnique({
    where: { postId_userId: { postId, userId } },
    select: {
      id: true,
      status: true,
      invitedBy: true,
      post: { select: { authorId: true, title: true } },
    },
  });
  if (!row || row.status !== "PENDING") {
    throw new CollaboratorError("수락할 초대가 없습니다.", 404);
  }

  const { max } = await getCollaboratorSettings();
  const active = await countActiveSlots(postId);
  // Pending already counted in active; accepting keeps the same slot count.
  if (active > max) {
    throw new CollaboratorError(
      `공동작업자 한도(${max}명)를 초과했습니다.`,
      403
    );
  }

  await db.postCollaborator.update({
    where: { id: row.id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), leftAt: null },
  });

  void import("@/lib/notifications").then(({ notifyPostCollabAccepted }) =>
    notifyPostCollabAccepted(
      postId,
      row.post.authorId,
      userId,
      row.post.title
    )
  );
}

export async function rejectCollaboratorInvite(
  postId: string,
  userId: string
): Promise<void> {
  const row = await db.postCollaborator.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true, status: true },
  });
  if (!row || row.status !== "PENDING") {
    throw new CollaboratorError("거절할 초대가 없습니다.", 404);
  }

  await db.postCollaborator.update({
    where: { id: row.id },
    data: { status: "DECLINED", leftAt: new Date() },
  });
}

export async function removeCollaborator(
  postId: string,
  actorId: string,
  targetUserId: string
): Promise<void> {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) throw new CollaboratorError("게시물을 찾을 수 없습니다.", 404);

  if (!(await canManageCollaborators(post, actorId))) {
    throw new CollaboratorError("작성자만 공동작업자를 제거할 수 있습니다.", 403);
  }
  if (targetUserId === post.authorId) {
    throw new CollaboratorError("작성자는 제거할 수 없습니다.");
  }

  const row = await db.postCollaborator.findUnique({
    where: { postId_userId: { postId, userId: targetUserId } },
    select: { id: true, status: true },
  });
  if (!row || (row.status !== "PENDING" && row.status !== "ACCEPTED")) {
    throw new CollaboratorError("공동작업자를 찾을 수 없습니다.", 404);
  }

  await db.postCollaborator.update({
    where: { id: row.id },
    data: { status: "REMOVED", leftAt: new Date() },
  });
}

export async function leaveCollaboration(
  postId: string,
  userId: string
): Promise<void> {
  const row = await db.postCollaborator.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true, status: true, post: { select: { authorId: true } } },
  });
  if (!row) {
    throw new CollaboratorError("공동작업 정보가 없습니다.", 404);
  }
  if (row.post.authorId === userId) {
    throw new CollaboratorError("작성자는 나갈 수 없습니다.");
  }
  if (row.status !== "ACCEPTED" && row.status !== "PENDING") {
    throw new CollaboratorError("공동작업 중이 아닙니다.");
  }

  await db.postCollaborator.update({
    where: { id: row.id },
    data: {
      status: row.status === "PENDING" ? "DECLINED" : "LEFT",
      leftAt: new Date(),
    },
  });
}

export async function listCollaborators(
  postId: string,
  viewerId?: string | null
) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      author: { select: userPublicSelect },
    },
  });
  if (!post) throw new CollaboratorError("게시물을 찾을 수 없습니다.", 404);

  const isAuthorOrAdmin =
    viewerId != null && (await canManageCollaborators(post, viewerId));

  const rows = await db.postCollaborator.findMany({
    where: {
      postId,
      status: isAuthorOrAdmin
        ? { in: ["PENDING", "ACCEPTED"] }
        : "ACCEPTED",
    },
    orderBy: [{ status: "asc" }, { acceptedAt: "asc" }, { invitedAt: "asc" }],
    select: {
      id: true,
      userId: true,
      status: true,
      invitedAt: true,
      acceptedAt: true,
      user: { select: userPublicSelect },
    },
  });

  return {
    author: post.author,
    collaborators: rows,
    max: (await getCollaboratorSettings()).max,
  };
}
