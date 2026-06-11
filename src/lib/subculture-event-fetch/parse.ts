/** 전각 숫자 → ASCII */
export function normalizeDigits(input: string): string {
  return input.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isoKst(y: number, m: number, d: number, h = 10, min = 0): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:00+09:00`;
}

/** 2026-07-18~2026-07-19 */
export function parseIsoRange(text: string): { startsAt: string; endsAt: string } | null {
  const m = text.match(/(20\d{2}-\d{2}-\d{2})~(20\d{2}-\d{2}-\d{2})/);
  if (!m) return null;
  return {
    startsAt: `${m[1]}T10:00:00+09:00`,
    endsAt: `${m[2]}T17:00:00+09:00`,
  };
}

/** 2026年8月15日～16日 · 2026年9月19日(土)〜9月20日(日) */
export function parseJaDayRange(text: string): { startsAt: string; endsAt: string } | null {
  const t = normalizeDigits(text);

  const secondMonth = t.match(
    /(20\d{2})年(\d{1,2})月(\d{1,2})日[^0-9]{0,20}[〜～~][^0-9]{0,8}(\d{1,2})月(\d{1,2})日/
  );
  if (secondMonth) {
    return {
      startsAt: isoKst(Number(secondMonth[1]), Number(secondMonth[2]), Number(secondMonth[3])),
      endsAt: isoKst(
        Number(secondMonth[1]),
        Number(secondMonth[4]),
        Number(secondMonth[5]),
        17
      ),
    };
  }

  const crossMonth = t.match(
    /(20\d{2})年(\d{1,2})月(\d{1,2})日[^0-9]{0,8}(\d{1,2})月(\d{1,2})日/
  );
  if (crossMonth) {
    return {
      startsAt: isoKst(Number(crossMonth[1]), Number(crossMonth[2]), Number(crossMonth[3])),
      endsAt: isoKst(Number(crossMonth[1]), Number(crossMonth[4]), Number(crossMonth[5]), 17),
    };
  }
  const sameMonth = t.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日[^0-9]{0,8}(\d{1,2})日/);
  if (sameMonth) {
    return {
      startsAt: isoKst(Number(sameMonth[1]), Number(sameMonth[2]), Number(sameMonth[3])),
      endsAt: isoKst(Number(sameMonth[1]), Number(sameMonth[2]), Number(sameMonth[4]), 17),
    };
  }
  return null;
}

/** 2026년 8월 14~16 */
export function parseKrYmdRange(text: string): { startsAt: string; endsAt: string } | null {
  const m = text.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})\s*[~～\-]\s*(\d{1,2})/);
  if (!m) return null;
  return {
    startsAt: isoKst(Number(m[1]), Number(m[2]), Number(m[3]), 10),
    endsAt: isoKst(Number(m[1]), Number(m[2]), Number(m[4]), 18),
  };
}

export function parseIsoDateTimes(text: string): string[] {
  return [...text.matchAll(/20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/g)].map(
    (m) => m[0]
  );
}

/** 2026.08.14 ~ 2026.08.16 */
export function parseDotDateRange(text: string): { startsAt: string; endsAt: string } | null {
  const m = text.match(/(20\d{2})\.(\d{1,2})\.(\d{1,2})\s*[~～\-]\s*(20\d{2})\.(\d{1,2})\.(\d{1,2})/);
  if (m) {
    return {
      startsAt: isoKst(Number(m[1]), Number(m[2]), Number(m[3]), 10),
      endsAt: isoKst(Number(m[4]), Number(m[5]), Number(m[6]), 18),
    };
  }
  const sameYear = text.match(/(20\d{2})\.(\d{1,2})\.(\d{1,2})\s*[~～\-]\s*(\d{1,2})\.(\d{1,2})/);
  if (sameYear) {
    return {
      startsAt: isoKst(Number(sameYear[1]), Number(sameYear[2]), Number(sameYear[3]), 10),
      endsAt: isoKst(Number(sameYear[1]), Number(sameYear[4]), Number(sameYear[5]), 18),
    };
  }
  return null;
}

/** 2026年7月26日(日) */
export function parseJaSingleDay(text: string): { startsAt: string; endsAt: string } | null {
  const t = normalizeDigits(text);
  const m = t.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  return {
    startsAt: isoKst(Number(m[1]), Number(m[2]), Number(m[3])),
    endsAt: isoKst(Number(m[1]), Number(m[2]), Number(m[3]), 17),
  };
}
