/** 게시글 투표 — 트위터 스타일 마감 시간 프리셋 (분) */
export const POST_POLL_DURATION_OPTIONS = [
  { label: "5분", minutes: 5 },
  { label: "30분", minutes: 30 },
  { label: "1시간", minutes: 60 },
  { label: "6시간", minutes: 360 },
  { label: "12시간", minutes: 720 },
  { label: "1일", minutes: 1440 },
  { label: "3일", minutes: 4320 },
  { label: "7일", minutes: 10080 },
] as const;

export const DEFAULT_POLL_DURATION_MINUTES = 1440;

export type CreatePostPollInput = {
  options: string[];
  durationMinutes: number;
};

export type PostPollView = {
  id: string;
  closesAt: string | Date;
  closed: boolean;
  options: { id: string; label: string; count: number }[];
  totalVotes: number;
  myVoteOptionId?: string | null;
};

export function isPostPollClosed(poll: { closesAt: Date | string; closed: boolean }): boolean {
  if (poll.closed) return true;
  return new Date(poll.closesAt).getTime() <= Date.now();
}

export function validatePostPollInput(input: CreatePostPollInput): string | null {
  const opts = input.options.map((o) => o.trim()).filter(Boolean);
  if (opts.length < 2) return "투표 선택지는 2개 이상 필요합니다.";
  if (opts.length > 4) return "투표 선택지는 최대 4개까지입니다.";
  if (opts.some((o) => o.length > 50)) return "선택지는 50자 이내로 입력해 주세요.";
  const unique = new Set(opts.map((o) => o.toLowerCase()));
  if (unique.size !== opts.length) return "선택지 내용이 중복되면 안 됩니다.";
  const allowed = POST_POLL_DURATION_OPTIONS.map((d) => d.minutes);
  if (!allowed.includes(input.durationMinutes as (typeof allowed)[number])) {
    return "투표 마감 시간이 올바르지 않습니다.";
  }
  return null;
}

export function pollClosesAtFromDuration(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function formatPollTimeLeft(closesAt: Date | string, closed: boolean): string {
  if (closed || isPostPollClosed({ closesAt, closed })) return "종료됨";
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return "종료됨";
  const totalMins = Math.max(1, Math.ceil(ms / 60000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days >= 1) {
    return hours > 0 ? `${days}일 ${hours}시간 남음` : `${days}일 남음`;
  }
  if (hours >= 1) {
    return mins > 0 ? `${hours}시간 ${mins}분 남음` : `${hours}시간 남음`;
  }
  return `${mins}분 남음`;
}

export function formatPollMeta(totalVotes: number, closesAt: Date | string, closed: boolean): string {
  return `${totalVotes.toLocaleString()}표 · ${formatPollTimeLeft(closesAt, closed)}`;
}

/** 표시용 % (합 100) + 막대 너비용 % (반올림 없이 비율, 단독 100%는 끝까지 채움) */
export function pollOptionPercents(
  options: { id: string; count: number }[],
  totalVotes: number
): Map<string, { labelPct: number; barPct: number }> {
  const out = new Map<string, { labelPct: number; barPct: number }>();
  if (totalVotes <= 0) {
    for (const o of options) out.set(o.id, { labelPct: 0, barPct: 0 });
    return out;
  }

  const raw = options.map((o) => (o.count / totalVotes) * 100);
  const floored = raw.map((r) => Math.floor(r));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const byFrac = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const label = [...floored];
  for (let k = 0; k < remainder; k++) {
    label[byFrac[k % byFrac.length]!.i] += 1;
  }

  options.forEach((o, i) => {
    let barPct = raw[i]!;
    if (o.count <= 0) barPct = 0;
    else if (o.count === totalVotes) barPct = 100;
    else barPct = Math.min(100, Math.max(0, barPct));
    out.set(o.id, { labelPct: label[i]!, barPct });
  });
  return out;
}

export const postPollSelect = {
  id: true,
  closesAt: true,
  closed: true,
  options: {
    select: {
      id: true,
      label: true,
      order: true,
      _count: { select: { votes: true } },
    },
    orderBy: { order: "asc" as const },
  },
  _count: { select: { votes: true } },
} as const;

type RawPoll = {
  id: string;
  closesAt: Date;
  closed: boolean;
  options: { id: string; label: string; order: number; _count: { votes: number } }[];
  _count: { votes: number };
};

export function mapPostPollRow(poll: RawPoll, myVoteOptionId?: string | null): PostPollView {
  const closed = poll.closed || isPostPollClosed(poll);
  return {
    id: poll.id,
    closesAt: poll.closesAt,
    closed,
    totalVotes: poll._count.votes,
    myVoteOptionId: myVoteOptionId ?? null,
    options: poll.options.map((o) => ({
      id: o.id,
      label: o.label,
      count: o._count.votes,
    })),
  };
}

export async function getPostPollVotesForUser(userId: string | undefined, pollIds: string[]) {
  if (!userId || pollIds.length === 0) return new Map<string, string>();
  const { db } = await import("@/lib/db");
  const rows = await db.postPollVote.findMany({
    where: { userId, pollId: { in: pollIds } },
    select: { pollId: true, optionId: true },
  });
  return new Map(rows.map((r) => [r.pollId, r.optionId]));
}

export async function hydrateViewerPollVotes<T extends { poll?: PostPollView | null }>(
  posts: T[],
  viewerId?: string | null
): Promise<T[]> {
  if (!viewerId || posts.length === 0) return posts;
  const pollIds = posts.flatMap((p) => (p.poll?.id ? [p.poll.id] : []));
  if (pollIds.length === 0) return posts;
  const votes = await getPostPollVotesForUser(viewerId, pollIds);
  if (votes.size === 0) return posts;
  return posts.map((post) => {
    if (!post.poll) return post;
    const optionId = votes.get(post.poll.id);
    if (!optionId) return post;
    return { ...post, poll: { ...post.poll, myVoteOptionId: optionId } };
  });
}

export async function castPostPollVote(
  postId: string,
  userId: string,
  optionId: string
): Promise<{ ok: true; poll: PostPollView } | { ok: false; status: number; error: string }> {
  const { db } = await import("@/lib/db");
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
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
    return { ok: false, status: 404, error: "투표를 찾을 수 없습니다." };
  }
  if (post.authorId === userId) {
    return { ok: false, status: 403, error: "작성자는 자신의 투표에 참여할 수 없습니다." };
  }

  const poll = post.poll;
  if (poll.closed || isPostPollClosed(poll)) {
    if (!poll.closed) {
      await db.postPoll.update({ where: { id: poll.id }, data: { closed: true } });
    }
    return { ok: false, status: 400, error: "투표가 종료되었습니다." };
  }
  if (!poll.options.some((o) => o.id === optionId)) {
    return { ok: false, status: 400, error: "선택지가 올바르지 않습니다." };
  }

  await db.postPollVote.upsert({
    where: { pollId_userId: { pollId: poll.id, userId } },
    create: { pollId: poll.id, optionId, userId },
    update: { optionId, votedAt: new Date() },
  });

  const fresh = await db.postPoll.findUnique({
    where: { id: poll.id },
    select: postPollSelect,
  });
  if (!fresh) return { ok: false, status: 404, error: "투표를 찾을 수 없습니다." };
  return { ok: true, poll: mapPostPollRow(fresh, optionId) };
}
