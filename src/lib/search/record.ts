import { createHash } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  clampOriginalQuery,
  editDistance,
  normalizeSearchQuery,
  topicSlugFromName,
} from "@/lib/search/normalize";

function hashIp(ip: string): string {
  return createHash("sha256").update(`mocomo-search-ip:${ip}`).digest("hex").slice(0, 32);
}

async function resolveRequestMeta() {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const country =
      h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || null;
    const locale = h.get("accept-language")?.split(",")[0]?.trim().slice(0, 16) || null;
    return {
      ipHash: ip ? hashIp(ip) : null,
      country: country?.slice(0, 8) || null,
      locale,
    };
  } catch {
    return { ipHash: null, country: null, locale: null };
  }
}

async function findBestTopicId(normalized: string): Promise<string | null> {
  if (!normalized) return null;

  const keywords = await db.searchTopicKeyword.findMany({
    select: { keyword: true, topicId: true },
    orderBy: { keyword: "desc" },
    take: 500,
  });

  let best: { topicId: string; len: number } | null = null;
  for (const row of keywords) {
    if (!row.keyword) continue;
    if (normalized === row.keyword || normalized.includes(row.keyword)) {
      if (!best || row.keyword.length > best.len) {
        best = { topicId: row.topicId, len: row.keyword.length };
      }
    }
  }
  if (best) return best.topicId;

  // 인기 정규화 검색어와 편집거리 1~2 매칭 (기본 오타)
  const popular = await db.searchQuery.findMany({
    take: 80,
    orderBy: { searchCount: "desc" },
    select: { normalizedQuery: true, topicId: true },
  });
  for (const p of popular) {
    if (!p.topicId) continue;
    const d = editDistance(normalized, p.normalizedQuery);
    const max = Math.max(1, Math.floor(p.normalizedQuery.length / 5));
    if (d > 0 && d <= Math.min(2, max)) return p.topicId;
  }

  return null;
}

async function ensureTopicForNormalized(normalized: string, display: string) {
  const existingId = await findBestTopicId(normalized);
  if (existingId) return existingId;

  // 새 Topic: 짧은 검색어는 그 자체, 긴 검색어는 앞 2~6자 루트 시도
  let name = display.trim() || normalized;
  if (normalized.length > 6) {
    // 이미 존재하는 짧은 topic 접두 재사용
    const prefixTopics = await db.searchTopic.findMany({
      where: { slug: { in: [normalized.slice(0, 2), normalized.slice(0, 3), normalized.slice(0, 4)] } },
      select: { id: true, slug: true },
    });
    const hit = prefixTopics.sort((a, b) => b.slug.length - a.slug.length)[0];
    if (hit) return hit.id;
    name = normalized.slice(0, Math.min(4, normalized.length));
  }

  const slug = topicSlugFromName(name);
  const topic = await db.searchTopic.upsert({
    where: { slug },
    create: { slug, name: name.slice(0, 64), searchCount: 0 },
    update: {},
  });

  await db.searchTopicKeyword.upsert({
    where: { keyword: slug },
    create: { topicId: topic.id, keyword: slug },
    update: {},
  });

  // 원 검색어도 keyword로 연결
  if (normalized !== slug) {
    await db.searchTopicKeyword.upsert({
      where: { keyword: normalized },
      create: { topicId: topic.id, keyword: normalized },
      update: {},
    }).catch(() => undefined);
  }

  return topic.id;
}

export type RecordSearchInput = {
  rawQuery: string;
  resultCount?: number;
  userId?: string | null;
};

/** 검색 1회 기록 — 원본 보존 + 정규화 + Topic 연결 + 카운트 */
export async function recordSearchEvent(input: RecordSearchInput) {
  const originalQuery = clampOriginalQuery(input.rawQuery);
  if (originalQuery.length < 1) return null;

  let normalizedQuery = normalizeSearchQuery(originalQuery);
  if (normalizedQuery.length < 1) {
    normalizedQuery = originalQuery.toLowerCase().replace(/\s+/g, "").slice(0, 80);
  }

  // 인기 검색어와 오타 교정 (정규화 키 교정)
  const popular = await db.searchQuery.findMany({
    take: 60,
    orderBy: { searchCount: "desc" },
    select: { normalizedQuery: true },
  });
  for (const p of popular) {
    const d = editDistance(normalizedQuery, p.normalizedQuery);
    if (d > 0 && d <= 1 && p.normalizedQuery.length >= 2) {
      normalizedQuery = p.normalizedQuery;
      break;
    }
  }

  const topicId = await ensureTopicForNormalized(normalizedQuery, originalQuery);
  const meta = await resolveRequestMeta();
  const resultCount = input.resultCount ?? 0;
  const now = new Date();

  const query = await db.searchQuery.upsert({
    where: { normalizedQuery },
    create: {
      normalizedQuery,
      displayQuery: originalQuery,
      topicId,
      searchCount: 1,
      zeroResultCount: resultCount === 0 ? 1 : 0,
      lastSearchedAt: now,
    },
    update: {
      displayQuery: originalQuery,
      topicId,
      searchCount: { increment: 1 },
      zeroResultCount: resultCount === 0 ? { increment: 1 } : undefined,
      lastSearchedAt: now,
    },
  });

  await db.searchQueryVariant.upsert({
    where: { originalQuery },
    create: {
      queryId: query.id,
      originalQuery,
      count: 1,
    },
    update: { count: { increment: 1 }, queryId: query.id },
  });

  if (topicId) {
    await db.searchTopic.update({
      where: { id: topicId },
      data: { searchCount: { increment: 1 } },
    });
  }

  const log = await db.searchLog.create({
    data: {
      originalQuery,
      normalizedQuery,
      queryId: query.id,
      topicId,
      userId: input.userId ?? null,
      ipHash: meta.ipHash,
      country: meta.country,
      locale: meta.locale,
      resultCount,
    },
  });

  return { query, log, topicId, normalizedQuery, originalQuery };
}

export async function recordSearchClick(input: {
  logId?: string;
  normalizedQuery?: string;
  clickedType: string;
  clickedId: string;
}) {
  if (input.logId) {
    await db.searchLog.update({
      where: { id: input.logId },
      data: {
        clickedType: input.clickedType.slice(0, 40),
        clickedId: input.clickedId.slice(0, 80),
      },
    });
  }

  const nq = input.normalizedQuery
    ? normalizeSearchQuery(input.normalizedQuery)
    : null;
  if (nq) {
    await db.searchQuery.updateMany({
      where: { normalizedQuery: nq },
      data: { clickCount: { increment: 1 } },
    });
  }
}
