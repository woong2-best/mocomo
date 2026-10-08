import { cookies } from "next/headers";
import { listEligibleSponsorCreatives } from "@/lib/sponsored-ad/eligible-creatives";
import {
  pickSponsorEvent,
  SPONSOR_ROTATION_COOKIE,
  type SponsorEventCandidate,
} from "@/lib/sponsor-event-rotation";

export type SponsorSpotEvent = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  authorName?: string;
  excerpt?: string;
  ctaLabel?: string;
  kind?: "post" | "event";
  postId?: string;
};

function toCandidate(row: SponsorSpotEvent): SponsorEventCandidate {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
  };
}

export async function listSponsorSpotPool(): Promise<SponsorSpotEvent[]> {
  const rows = await listEligibleSponsorCreatives();
  return rows
    .filter((e) => !!e.imageUrl?.trim())
    .map((e) => ({
      id: e.id,
      title: e.title,
      imageUrl: e.imageUrl,
      linkUrl: e.linkUrl,
      authorName: e.authorName,
      excerpt: e.excerpt,
      ctaLabel: e.ctaLabel,
      kind: e.kind,
      postId: e.postId,
    }));
}

/** SSR 우측 패널 — 쿠키 기준 로테이션만 읽고 응답 쿠키는 갱신하지 않음 */
export async function getSponsorSpotPreview(): Promise<SponsorSpotEvent | null> {
  const pool = await listSponsorSpotPool();
  const cookieStore = await cookies();
  const raw = cookieStore.get(SPONSOR_ROTATION_COOKIE)?.value;
  const { event } = pickSponsorEvent(pool.map(toCandidate), raw);
  if (!event) return null;
  return pool.find((row) => row.id === event.id) ?? event;
}
