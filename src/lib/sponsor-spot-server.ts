import { cookies } from "next/headers";
import { listEligibleSponsorEventsForMobile } from "@/lib/sponsored-ad/eligible-events";
import {
  pickSponsorEvent,
  SPONSOR_ROTATION_COOKIE,
  type SponsorEventCandidate,
} from "@/lib/sponsor-event-rotation";

export type SponsorSpotEvent = {
  id: string;
  title: string;
  imageUrl: string;
};

/** SSR 우측 패널 — 쿠키 기준 로테이션만 읽고 응답 쿠키는 갱신하지 않음 */
export async function getSponsorSpotPreview(): Promise<SponsorSpotEvent | null> {
  const rows = await listEligibleSponsorEventsForMobile();
  const pool: SponsorEventCandidate[] = rows
    .filter((e): e is typeof e & { imageUrl: string } => !!e.imageUrl?.trim())
    .map((e) => ({ id: e.id, title: e.title, imageUrl: e.imageUrl }));

  const cookieStore = await cookies();
  const raw = cookieStore.get(SPONSOR_ROTATION_COOKIE)?.value;
  const { event } = pickSponsorEvent(pool, raw);
  return event;
}
