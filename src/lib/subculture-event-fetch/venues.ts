import {
  getMasterVenueById,
  resolveMasterVenue,
  type MasterVenue,
} from "@/lib/subculture-event-venues-master";

type Venue = {
  lat: number;
  lng: number;
  address: string;
  venueName: string;
};

function toVenue(master: MasterVenue): Venue {
  return {
    lat: master.lat,
    lng: master.lng,
    venueName: master.venueName,
    address: master.address,
  };
}

function requireVenue(id: string): Venue {
  const master = getMasterVenueById(id);
  if (!master) throw new Error(`Missing master venue: ${id}`);
  return toVenue(master);
}

/** @deprecated SUBCULTURE_VENUE_MASTER 직접 사용 권장 */
export const VENUES: Record<string, Venue> = {
  kintex: requireVenue("kintex"),
  kintex2: requireVenue("kintex2"),
  coex: requireVenue("coex"),
  bexco: requireVenue("bexco"),
  setec: requireVenue("setec"),
  tokyo_big_sight: requireVenue("tokyo-big-sight"),
  makuhari: requireVenue("makuhari-messe"),
  kyoto_miyako: requireVenue("kyoto-miyako"),
};

/** 크롤러·시드용 — 행사장 마스터 DB 키워드 매칭 */
export function venueByKeyword(text: string): Venue | null {
  const hit = resolveMasterVenue("other", text, text);
  return hit ? toVenue(hit) : null;
}
