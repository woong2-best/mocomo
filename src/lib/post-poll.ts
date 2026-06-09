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
  if (closed || isPostPollClosed({ closesAt, closed })) return "투표 종료";
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return "투표 종료";
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins}분 남음`;
  const hours = Math.ceil(mins / 60);
  if (hours < 48) return `${hours}시간 남음`;
  const days = Math.ceil(hours / 24);
  return `${days}일 남음`;
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
