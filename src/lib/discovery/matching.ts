import type { DiscoveryGender, DiscoveryLookingFor, DiscoveryProfile } from "@prisma/client";
import { usedAgeFromBirthDate } from "@/lib/used-youth-protection";
import { DISCOVERY_MIN_AGE } from "./constants";
import type { DiscoveryCard } from "./types";

type CandidateUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  birthDate: Date | null;
  isBanned: boolean;
  profile: {
    bio: string | null;
    favoriteTags: string[];
    mainCharacter: string | null;
    snsLinks: unknown;
  } | null;
  cosplayerProfile: {
    stageName: string | null;
    bio: string | null;
    photos: { url: string; character: string | null; series: string | null }[];
    animes: { character: string | null; anime: { title: string } }[];
  } | null;
  discoveryProfile: DiscoveryProfile;
  animeFollows: { animeId: string }[];
};

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function ageFromBirth(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;
  const age = usedAgeFromBirthDate(birthDate);
  return age >= DISCOVERY_MIN_AGE ? age : null;
}

function locationText(snsLinks: unknown): string | null {
  if (!snsLinks || typeof snsLinks !== "object") return null;
  const loc = (snsLinks as { location?: string }).location;
  return loc?.trim() || null;
}

function passesGenderFilter(
  mine: DiscoveryProfile,
  theirs: DiscoveryProfile
): boolean {
  if (mine.preferredGenders.length === 0) return true;
  if (!theirs.showGender || theirs.gender === "UNSPECIFIED") return true;
  return mine.preferredGenders.includes(theirs.gender);
}

function passesLookingFor(
  mine: DiscoveryLookingFor,
  theirs: DiscoveryLookingFor,
  isCosplayer: boolean
): boolean {
  const wantsCosplay = mine === "COSPLAY" || mine === "BOTH";
  const wantsFriends = mine === "FRIENDS" || mine === "BOTH";
  const offersCosplay = theirs === "COSPLAY" || theirs === "BOTH";
  const offersFriends = theirs === "FRIENDS" || theirs === "BOTH";

  if (mine === "COSPLAY" && !isCosplayer && !offersCosplay) return false;
  if (theirs === "COSPLAY" && !isCosplayer) return false;

  if (wantsCosplay && offersCosplay && isCosplayer) return true;
  if (wantsFriends && offersFriends) return true;
  return mine === "BOTH" && theirs === "BOTH";
}

export function scoreCandidate(
  me: DiscoveryProfile & { user: Pick<CandidateUser, "profile" | "animeFollows"> },
  candidate: CandidateUser,
  myAnimeIds: Set<string>,
  myTags: string[]
): number {
  let score = 20;

  const sharedAnime = candidate.animeFollows.filter((a) => myAnimeIds.has(a.animeId)).length;
  score += sharedAnime * 12;

  const tagOverlap = candidate.profile?.favoriteTags.filter((t) =>
    myTags.some((m) => m.toLowerCase() === t.toLowerCase())
  ).length ?? 0;
  score += tagOverlap * 8;

  const isCosplayer = !!candidate.cosplayerProfile?.photos.length;
  if (me.lookingFor !== "FRIENDS" && isCosplayer) score += 15;
  if (me.lookingFor === "FRIENDS" && candidate.discoveryProfile.lookingFor === "FRIENDS") score += 10;

  const daysSinceActive =
    (Date.now() - candidate.discoveryProfile.lastActiveAt.getTime()) / 86400000;
  if (daysSinceActive < 3) score += 8;
  else if (daysSinceActive < 14) score += 4;

  if (
    me.lat != null &&
    me.lng != null &&
    candidate.discoveryProfile.lat != null &&
    candidate.discoveryProfile.lng != null
  ) {
    const dist = haversineKm(me.lat, me.lng, candidate.discoveryProfile.lat, candidate.discoveryProfile.lng);
    score += Math.max(0, 25 - dist / 2);
  }

  score += Math.random() * 6;
  return score;
}

export function filterAndRankCandidates(
  me: DiscoveryProfile & { user: Pick<CandidateUser, "profile" | "animeFollows"> },
  candidates: CandidateUser[],
  myAnimeIds: Set<string>,
  myTags: string[]
): DiscoveryCard[] {
  const cards: DiscoveryCard[] = [];

  for (const c of candidates) {
    if (c.isBanned || !c.discoveryProfile.enabled) continue;
    if (!passesGenderFilter(me, c.discoveryProfile)) continue;

    const age = ageFromBirth(c.birthDate);
    if (age != null && (age < me.minAge || age > me.maxAge)) continue;
    if (age == null && me.minAge > DISCOVERY_MIN_AGE) continue;

    const isCosplayer = (c.cosplayerProfile?.photos.length ?? 0) > 0;
    if (!passesLookingFor(me.lookingFor, c.discoveryProfile.lookingFor, isCosplayer)) continue;

    let distanceKm: number | null = null;
    if (
      me.lat != null &&
      me.lng != null &&
      c.discoveryProfile.lat != null &&
      c.discoveryProfile.lng != null
    ) {
      distanceKm = haversineKm(me.lat, me.lng, c.discoveryProfile.lat, c.discoveryProfile.lng);
      if (distanceKm > me.maxDistanceKm) continue;
    }

    const dp = c.discoveryProfile;
    const photo = c.cosplayerProfile?.photos[0];
    const animeTitles = [
      ...(c.cosplayerProfile?.animes.map((a) => a.anime.title) ?? []),
    ].slice(0, 4);

    cards.push({
      userId: c.id,
      username: c.username,
      name: c.name,
      image: c.image,
      bio: c.profile?.bio ?? c.cosplayerProfile?.bio ?? null,
      pitch: dp.pitch,
      city: dp.city ?? locationText(c.profile?.snsLinks),
      age: dp.showAge ? age : null,
      gender: dp.showGender ? dp.gender : null,
      showGender: dp.showGender,
      showAge: dp.showAge,
      distanceKm: distanceKm != null ? Math.round(distanceKm) : null,
      favoriteTags: c.profile?.favoriteTags.slice(0, 6) ?? [],
      mainCharacter: c.profile?.mainCharacter ?? null,
      animeTitles,
      isCosplayer,
      cosplayPhoto: photo?.url ?? null,
      cosplayCharacter: photo?.character ?? c.cosplayerProfile?.animes[0]?.character ?? null,
      matchScore: scoreCandidate(me, c, myAnimeIds, myTags),
      lookingFor: dp.lookingFor,
    });
  }

  cards.sort((a, b) => b.matchScore - a.matchScore);
  return cards.slice(0, 24);
}

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
