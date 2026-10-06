import type { BirthDateSource } from "@prisma/client";
import { db } from "@/lib/db";
import { formatBirthDateLabel } from "@/lib/birth-date";

const MATCH_LIMIT = 20;
const LOG_LIMIT = 1000;

const SOURCE_LABEL: Record<BirthDateSource, string> = {
  SIGNUP: "가입",
  OAUTH_COMPLETE: "소셜 가입",
  PROFILE_EDIT: "프로필 수정",
  ADMIN: "관리자",
};

export function birthDateSourceLabel(source: BirthDateSource): string {
  return SOURCE_LABEL[source] ?? source;
}

export function formatDisputeTimestamp(value: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(value);
  return `${parts} KST`;
}

export async function searchBirthDateUsers(q: string) {
  const query = q.trim();
  if (!query) return [];
  return db.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { id: query },
      ],
    },
    take: MATCH_LIMIT,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      birthDate: true,
    },
  });
}

export async function getBirthDateAdminRecord(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      birthDate: true,
      birthDateSource: true,
      birthDateCollectedAt: true,
      createdAt: true,
      birthDateChangeLogs: {
        orderBy: { createdAt: "asc" },
        take: LOG_LIMIT,
        select: {
          id: true,
          previousValue: true,
          newValue: true,
          source: true,
          actorId: true,
          createdAt: true,
          actor: { select: { username: true } },
        },
      },
    },
  });
  if (!user) return null;

  const firstFromLog = user.birthDateChangeLogs.find((row) => row.newValue)?.createdAt ?? null;
  return {
    user,
    logs: user.birthDateChangeLogs,
    firstCollectedAt: firstFromLog ?? user.birthDateCollectedAt,
  };
}

export type BirthDateAdminRecord = NonNullable<Awaited<ReturnType<typeof getBirthDateAdminRecord>>>;

function csvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function buildBirthDateHistoryCsv(record: BirthDateAdminRecord): string {
  const header = [
    "userId",
    "username",
    "email",
    "currentBirthDate",
    "firstCollectedAtUtc",
    "firstCollectedAtKst",
    "changedAtUtc",
    "changedAtKst",
    "previousValue",
    "newValue",
    "source",
    "actorId",
    "actorUsername",
  ];
  const current = formatBirthDateLabel(record.user.birthDate);
  const firstUtc = record.firstCollectedAt?.toISOString() ?? "";
  const firstKst = record.firstCollectedAt ? formatDisputeTimestamp(record.firstCollectedAt) : "";
  const base = [record.user.id, record.user.username, record.user.email ?? "", current, firstUtc, firstKst];

  const rows =
    record.logs.length > 0
      ? record.logs.map((row) => [
          ...base,
          row.createdAt.toISOString(),
          formatDisputeTimestamp(row.createdAt),
          formatBirthDateLabel(row.previousValue),
          formatBirthDateLabel(row.newValue),
          row.source,
          row.actorId ?? "",
          row.actor?.username ?? "",
        ])
      : [[...base, "", "", "", "", "", "", ""]];

  const lines = [header, ...rows].map((cols) => cols.map((col) => csvCell(String(col))).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}
