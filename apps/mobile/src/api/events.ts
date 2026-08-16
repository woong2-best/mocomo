import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type EventListItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt: string;
  imageUrl: string | null;
  prize: string | null;
  participantCount: number;
  createdBy: { username: string; name: string | null } | null;
};

export type EventDetail = {
  id: string;
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt: string;
  imageUrl: string | null;
  prize: string | null;
  linkUrl: string | null;
  videoUrl: string | null;
  participantCount: number;
  joined: boolean;
  createdBy: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  } | null;
};

export type MapEventPin = {
  id: string;
  title: string;
  country: string;
  category: string;
  categoryLabel: string;
  venueName: string | null;
  description: string | null;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string | null;
  sourceUrl: string | null;
  source: string;
};

export async function fetchEventsList() {
  return apiRequest<{ items: EventListItem[] }>(MobileApi.events, { auth: true });
}

export async function fetchEventDetail(id: string) {
  return apiRequest<{ item: EventDetail }>(`${MobileApi.events}/${id}`, { auth: true });
}

export async function joinEvent(id: string, entryUrl?: string) {
  return apiRequest<{ success: boolean }>(`${MobileApi.events}/${id}/join`, {
    method: "POST",
    body: entryUrl ? { entryUrl } : {},
  });
}

export async function fetchEventsMap(opts?: { global?: boolean; country?: string }) {
  const params = new URLSearchParams();
  if (opts?.global) params.set("global", "1");
  if (opts?.country) params.set("country", opts.country);
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ pins: MapEventPin[] }>(`${MobileApi.events}/map${suffix}`, { auth: true });
}
