import type { DiscoveryGender, DiscoveryLookingFor, DiscoveryMatchingMode } from "@prisma/client";

export type DiscoveryCard = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  pitch: string | null;
  city: string | null;
  age: number | null;
  gender: DiscoveryGender | null;
  showGender: boolean;
  showAge: boolean;
  distanceKm: number | null;
  favoriteTags: string[];
  mainCharacter: string | null;
  animeTitles: string[];
  isCosplayer: boolean;
  cosplayPhoto: string | null;
  cosplayCharacter: string | null;
  matchScore: number;
  lookingFor: DiscoveryLookingFor;
  randomPick?: boolean;
};

export type DiscoverySettings = {
  enabled: boolean;
  gender: DiscoveryGender;
  showGender: boolean;
  showAge: boolean;
  city: string | null;
  lat: number | null;
  lng: number | null;
  maxDistanceKm: number;
  minAge: number;
  maxAge: number;
  lookingFor: DiscoveryLookingFor;
  matchingMode: DiscoveryMatchingMode;
  preferredGenders: DiscoveryGender[];
  pitch: string | null;
  hasBirthDate: boolean;
};

export type DiscoveryMatchRow = {
  matchId: string;
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  matchedAt: string;
  isCosplayer: boolean;
  cosplayPhoto: string | null;
  unseen: boolean;
};
