import { db } from "@/lib/db";

export type FleaEventStatus = "scheduled" | "running" | "ended";

export type FleaEventDto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  notice: string | null;
  bannerUrl: string | null;
  startsAt: string;
  endsAt: string;
  feeRate: number;
  active: boolean;
  published: boolean;
  status: FleaEventStatus;
};

export function resolveFleaEventStatus(row: {
  active: boolean;
  startsAt: Date;
  endsAt: Date;
}): FleaEventStatus {
  const now = Date.now();
  if (!row.active || now > row.endsAt.getTime()) return "ended";
  if (now < row.startsAt.getTime()) return "scheduled";
  return "running";
}

function toDto(row: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  notice: string | null;
  bannerUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  feeRate: number;
  active: boolean;
  published: boolean;
}): FleaEventDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    notice: row.notice,
    bannerUrl: row.bannerUrl,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    feeRate: row.feeRate,
    active: row.active,
    published: row.published,
    status: resolveFleaEventStatus(row),
  };
}

/** 유저에게 노출되는 진행 중 이벤트 (자동 상태 전환) */
export async function getActiveFleaEvent(): Promise<FleaEventDto | null> {
  const now = new Date();
  const row = await db.aptFleaEvent.findFirst({
    where: {
      active: true,
      published: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "desc" },
  });
  return row ? toDto(row) : null;
}

export async function recordFleaEventVisit(eventId: string): Promise<void> {
  await db.aptFleaEvent.update({
    where: { id: eventId },
    data: { visitCount: { increment: 1 } },
  });
}

/** @deprecated 개발용 시드 — Admin에서 이벤트 생성 권장 */
export async function seedFleaEvent(): Promise<FleaEventDto> {
  const existing = await getActiveFleaEvent();
  if (existing) return existing;

  const now = new Date();
  const startsAt = new Date(now.getTime() - 60_000);
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const row = await db.aptFleaEvent.upsert({
    where: { slug: "weekly-flea" },
    create: {
      slug: "weekly-flea",
      title: "주말 벼룩시장",
      description: "창고 가구를 낮은 수수료로 거래해 보세요!",
      startsAt,
      endsAt,
      feeRate: 0.03,
      active: true,
      published: true,
    },
    update: {},
  });
  return toDto(row);
}

export const FLEA_STATUS_LABEL: Record<FleaEventStatus, string> = {
  scheduled: "예정",
  running: "진행중",
  ended: "종료",
};
