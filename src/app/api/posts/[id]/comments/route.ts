import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireApiUser } from "@/lib/api-post-auth";
import { notifyPostComment } from "@/lib/notifications";
import { userPublicSelect } from "@/lib/user-public-select";
import {
  getPostCommentsPage,
} from "@/lib/comment-service";
import type { PostCommentSort } from "@/lib/post-queries";
import { assertUserBlockInteractionAllowed } from "@/lib/user-block";
import { parseCommentMediaInput, serializeCommentMedia } from "@/lib/comment-media";
import { resolveCommentReplyTarget } from "@/lib/comment-reply-target";

function parseSort(raw: string | null, isQna: boolean): PostCommentSort {
  if (isQna) {
    if (raw === "newest" || raw === "popular" || raw === "oldest") return raw;
    return "oldest";
  }
  if (raw === "newest" || raw === "popular" || raw === "oldest" || raw === "ranked") {
    return raw;
  }
  return "ranked";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-comment-list", 120);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sortParam = req.nextUrl.searchParams.get("sort");
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
    : 20;
  const cursor = req.nextUrl.searchParams.get("cursor");

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, communityId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const isQna = Boolean(post.communityId);
    const sort = parseSort(sortParam, isQna);
    const session = await auth();
    const page = await getPostCommentsPage({
      postId,
      postAuthorId: post.authorId,
      sort,
      limit,
      cursor,
      viewerId: session?.user?.id ?? null,
      includePinned: !isQna,
      communityId: post.communityId,
    });

    return NextResponse.json({
      ...page,
      postAuthorId: post.communityId ? null : post.authorId,
      viewerId: session?.user?.id ?? null,
    });
  } catch (e) {
    console.error("[api/posts/comments GET]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/CommentLike|likeCount|pinnedAt|does not exist|column/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Please check your input and try again.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Couldn't load comments." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-comment", 40);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "comment" });
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: {
    content?: string;
    parentId?: string;
    replyToUserId?: string;
    mediaType?: string;
    mediaUrl?: string;
    media_type?: string;
    media_url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const media = parseCommentMediaInput(body);
  if (!media.ok) {
    return NextResponse.json({ error: media.error }, { status: 400 });
  }
  const content = media.content;

  const requestedParentId =
    typeof body.parentId === "string" && body.parentId.length > 0 && body.parentId.length <= 64
      ? body.parentId
      : undefined;
  const requestedReplyToUserId =
    typeof body.replyToUserId === "string" &&
    body.replyToUserId.length > 0 &&
    body.replyToUserId.length <= 64
      ? body.replyToUserId
      : undefined;

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, communityId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const blockErr = await assertUserBlockInteractionAllowed(user.id, post.authorId);
    if (blockErr) {
      return NextResponse.json({ error: errorText(blockErr.error) }, { status: 403 });
    }

    let parentId: string | undefined;
    let replyToUserId: string | undefined;
    let parentCommentAuthorId: string | undefined;
    if (requestedParentId) {
      const resolved = await resolveCommentReplyTarget({
        postId,
        parentId: requestedParentId,
        replyToUserId: requestedReplyToUserId,
      });
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      }
      parentId = resolved.value.parentId;
      replyToUserId = resolved.value.replyToUserId;
      parentCommentAuthorId = resolved.value.notifyUserId;
      const parentBlockErr = await assertUserBlockInteractionAllowed(user.id, parentCommentAuthorId);
      if (parentBlockErr) {
        return NextResponse.json({ error: errorText(parentBlockErr.error) }, { status: 403 });
      }
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: userPublicSelect,
    });

    const comment = await db.comment.create({
      data: {
        content,
        authorId: user.id,
        postId,
        parentId,
        replyToUserId,
        mediaType: media.mediaType,
        mediaUrl: media.mediaUrl,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        likeCount: true,
        pinnedAt: true,
        mediaType: true,
        mediaUrl: true,
        authorId: true,
        parentId: true,
        replyToUserId: true,
        author: { select: userPublicSelect },
        replyToUser: { select: { id: true, username: true } },
      },
    });

    void notifyPostComment({
      postId,
      postAuthorId: post.authorId,
      commentId: comment.id,
      actorId: user.id,
      parentCommentAuthorId,
      content: content || (media.mediaType === "GIF" ? "GIF" : "Photo"),
    });

    revalidatePath(`/post/${postId}`);
    if (!post.communityId) {
      revalidatePath("/");
      revalidatePath("/reels");
    }

    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        likeCount: 0,
        likedByMe: false,
        likedByAuthor: false,
        isPostAuthor: comment.authorId === post.authorId,
        isPinned: false,
        pinnedAt: null,
        isEdited: false,
        replyCount: 0,
        parentId: comment.parentId,
        replyToUser: comment.replyToUser ?? null,
        ...serializeCommentMedia(comment),
        author: fullUser ?? comment.author,
        replies: [],
      },
    });
  } catch (e) {
    console.error("[api/posts/comments]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/comment|does not exist|column/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Please check your input and try again.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
