import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isPostPollClosed,
  mapPostPollRow,
  postPollSelect,
  type PostPollView,
} from "@/lib/post-poll";

async function loadPollView(pollId: string, userId?: string): Promise<PostPollView | null> {
  const poll = await db.postPoll.findUnique({
    where: { id: pollId },
    select: postPollSelect,
  });
  if (!poll) return null;

  let myVoteOptionId: string | null = null;
  if (userId) {
    const vote = await db.postPollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
      select: { optionId: true },
    });
    myVoteOptionId = vote?.optionId ?? null;
  }

  return mapPostPollRow(poll, myVoteOptionId);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: postId } = await ctx.params;
  let body: { optionId?: string };
  try {
    body = (await req.json()) as { optionId?: string };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const optionId = body.optionId?.trim();
  if (!optionId) {
    return NextResponse.json({ error: "선택지를 지정해 주세요." }, { status: 400 });
  }

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      poll: {
        select: {
          id: true,
          closesAt: true,
          closed: true,
          options: { select: { id: true } },
        },
      },
    },
  });

  if (!post?.poll) {
    return NextResponse.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });
  }

  const poll = post.poll;
  if (poll.closed || isPostPollClosed(poll)) {
    if (!poll.closed) {
      await db.postPoll.update({ where: { id: poll.id }, data: { closed: true } });
    }
    return NextResponse.json({ error: "투표가 종료되었습니다." }, { status: 400 });
  }

  if (!poll.options.some((o) => o.id === optionId)) {
    return NextResponse.json({ error: "선택지가 올바르지 않습니다." }, { status: 400 });
  }

  await db.postPollVote.upsert({
    where: { pollId_userId: { pollId: poll.id, userId } },
    create: { pollId: poll.id, optionId, userId },
    update: { optionId, votedAt: new Date() },
  });

  const view = await loadPollView(poll.id, userId);
  return NextResponse.json({ poll: view });
}
