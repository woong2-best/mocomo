/** MOCO earned 정산 일정 — KST 기준 매월 25일 Lock·지급 */
export const MOCO_SETTLEMENT_TIMEZONE = "Asia/Seoul";
export const MOCO_SETTLEMENT_PAY_DAY = 25;

export type MocoEarnedPeriod = {
  periodYear: number;
  periodMonth: number;
  periodStart: Date;
  periodEnd: Date;
  scheduledPayAt: Date;
};

function seoulParts(now: Date): { year: number; month: number; day: number } {
  const y = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: MOCO_SETTLEMENT_TIMEZONE, year: "numeric" }).format(now),
  );
  const m = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: MOCO_SETTLEMENT_TIMEZONE, month: "2-digit" }).format(now),
  );
  const d = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: MOCO_SETTLEMENT_TIMEZONE, day: "2-digit" }).format(now),
  );
  return { year: y, month: m, day: d };
}

/** Lock/정산 실행일(25일)인지 — `force`는 관리자·스테이징용 */
export function isMocoSettlementLockDay(now = new Date(), force = false): boolean {
  if (force) return true;
  return seoulParts(now).day === MOCO_SETTLEMENT_PAY_DAY;
}

/** 전월 달력 구간 (KST 1일 00:00 ~ 말일 23:59:59.999) */
export function previousMonthEarnedPeriod(asOf = new Date()): MocoEarnedPeriod {
  const { year, month } = seoulParts(asOf);
  let periodYear = year;
  let periodMonth = month - 1;
  if (periodMonth < 1) {
    periodMonth = 12;
    periodYear -= 1;
  }

  const periodStart = new Date(
    `${periodYear}-${String(periodMonth).padStart(2, "0")}-01T00:00:00+09:00`,
  );
  const nextMonth = periodMonth === 12 ? 1 : periodMonth + 1;
  const nextYear = periodMonth === 12 ? periodYear + 1 : periodYear;
  const periodEndExclusive = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`,
  );
  const periodEnd = new Date(periodEndExclusive.getTime() - 1);

  let payMonth = periodMonth + 1;
  let payYear = periodYear;
  if (payMonth > 12) {
    payMonth = 1;
    payYear += 1;
  }
  const scheduledPayAt = new Date(
    `${payYear}-${String(payMonth).padStart(2, "0")}-${String(MOCO_SETTLEMENT_PAY_DAY).padStart(2, "0")}T09:00:00+09:00`,
  );

  return { periodYear, periodMonth, periodStart, periodEnd, scheduledPayAt };
}

export function earnedPeriodKey(periodYear: number, periodMonth: number): string {
  return `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
}
