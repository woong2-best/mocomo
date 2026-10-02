"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { CosplayBoardMode as PrismaMode } from "@prisma/client";
import {
  COSPLAY_BOARD_PAGE_SIZE,
  formatCosplayBoardPriceLabel,
  toUiMode,
  type CosplayBoardMode,
  type CosplayBoardListItem,
} from "@/lib/cosplay-board-data";

const DB_SETUP_MSG =
  "actions.db_supabase_sql_editor_scripts";

function toPrismaMode(mode: CosplayBoardMode): PrismaMode {
  return mode === "purchase" ? "PURCHASE" : "RENTAL";
}

function mapListItem(
  row: {
    id: string;
    mode: PrismaMode;
    title: string;
    price: number | null;
    priceLabel: string | null;
    viewCount: number;
    isNotice: boolean;
    createdAt: Date;
    author: { username: string; name: string | null };
    _count: { comments: number };
  }
): CosplayBoardListItem {
  return {
    id: row.id,
    mode: toUiMode(row.mode),
    title: row.title,
    author: row.author.name?.trim() || row.author.username,
    authorUsername: row.author.username,
    createdAt: row.createdAt,
    viewCount: row.viewCount,
    commentCount: row._count.comments,
    priceLabel:
      row.priceLabel?.trim() ||
      formatCosplayBoardPriceLabel(toUiMode(row.mode), row.price),
    isNotice: row.isNotice,
  };
}

export async function isCosplayBoardDbReady() {
  try {
    await db.cosplayBoardPost.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export async function getCosplayBoardPosts(params: {
  mode: CosplayBoardMode;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const skip = (page - 1) * COSPLAY_BOARD_PAGE_SIZE;

  try {
    const [rows, totalCount] = await Promise.all([
      db.cosplayBoardPost.findMany({
        where: { mode: toPrismaMode(params.mode), status: "OPEN" },
        orderBy: [{ isNotice: "desc" }, { createdAt: "desc" }],
        skip,
        take: COSPLAY_BOARD_PAGE_SIZE,
        include: {
          author: { select: { username: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
      db.cosplayBoardPost.count({
        where: { mode: toPrismaMode(params.mode), status: "OPEN" },
      }),
    ]);

    return {
      posts: rows.map(mapListItem),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / COSPLAY_BOARD_PAGE_SIZE)),
      currentPage: page,
    };
  } catch {
    return {
      posts: [] as CosplayBoardListItem[],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
    };
  }
}

export async function getCosplayBoardPostDetail(id: string) {
  try {
    const post = await db.cosplayBoardPost.findUnique({
      where: { id, status: "OPEN" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            supportTierSent: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                supportTierSent: true,
              },
            },
          },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!post) return null;

    await db.cosplayBoardPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const images = Array.isArray(post.images)
      ? (post.images as unknown[]).filter((u): u is string => typeof u === "string")
      : [];

    return {
      ...post,
      viewCount: post.viewCount + 1,
      mode: toUiMode(post.mode),
      images,
      priceLabel:
        post.priceLabel?.trim() ||
        formatCosplayBoardPriceLabel(toUiMode(post.mode), post.price),
      commentCount: post._count.comments,
    };
  } catch {
    return null;
  }
}

export async function createCosplayBoardPost(data: {
  mode: CosplayBoardMode;
  title: string;
  content: string;
  price?: number;
  priceLabel?: string;
  region?: string;
  workTitle?: string;
  character?: string;
  sizeLabel?: string;
  images?: string[];
}) {
  const user = await requireAuth();

  const title = data.title.trim();
  const content = data.content.trim();
  if (title.length < 2) return { error: "actions.s1nza8w" };
  if (title.length > 200) return { error: "actions.200" };
  if (content.length < 10) return { error: "actions.s3z4sa9" };

  const price =
    data.price != null && Number.isFinite(data.price) && data.price > 0
      ? Math.floor(data.price)
      : null;

  const images = (data.images ?? []).filter(
    (u) =>
      typeof u === "string" &&
      u.startsWith("https://") &&
      !u.startsWith("blob:") &&
      !(process.env.VERCEL && u.startsWith("/uploads/"))
  );

  const priceLabel =
    data.priceLabel?.trim() ||
    formatCosplayBoardPriceLabel(data.mode, price) ||
    (price == null ? "actions.s11i7b" : undefined);

  try {
    const post = await db.cosplayBoardPost.create({
      data: {
        authorId: user.id,
        mode: toPrismaMode(data.mode),
        title,
        content,
        price,
        priceLabel,
        region: data.region?.trim() || null,
        workTitle: data.workTitle?.trim() || null,
        character: data.character?.trim() || null,
        sizeLabel: data.sizeLabel?.trim() || null,
        images,
      },
    });

    revalidatePath("/cosplay");
    revalidatePath(`/cosplay/board/${post.id}`);
    return { postId: post.id };
  } catch (e) {
    console.error("[createCosplayBoardPost]", e);
    return { error: DB_SETUP_MSG };
  }
}

export async function createCosplayBoardComment(postId: string, content: string) {
  const user = await requireAuth();
  const text = content.trim();
  if (text.length < 1) return { error: "actions.syraox7" };
  if (text.length > 2000) return { error: "actions.2000" };

  try {
    const post = await db.cosplayBoardPost.findUnique({
      where: { id: postId, status: "OPEN" },
      select: { id: true },
    });
    if (!post) return { error: "actions.s1v13ofx" };

    await db.cosplayBoardComment.create({
      data: {
        postId,
        authorId: user.id,
        content: text,
      },
    });

    revalidatePath(`/cosplay/board/${postId}`);
    revalidatePath("/cosplay");
    return { ok: true as const };
  } catch {
    return { error: DB_SETUP_MSG };
  }
}
