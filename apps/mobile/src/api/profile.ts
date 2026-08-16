import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type ProfileSettings = {
  mainCharacter: string;
  favoriteTags: string;
  location: string;
  website: string;
  showNsfw: boolean;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  showBirthdayOnProfile: boolean;
  usernameChangesRemaining: number;
  usernameChangeResetAt: string | null;
};

export type ProfileEditState = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  bannerUrl: string | null;
  bannerVideoUrl: string | null;
  locale: string;
  countryCode: string;
  timeZone: string;
  settings: ProfileSettings | null;
};

export async function fetchProfileEditState() {
  const res = await apiRequest<{ user: ProfileEditState }>(MobileApi.me, { auth: true });
  return res.user;
}

export type PatchProfileBody = {
  name?: string;
  bio?: string;
  image?: string | null;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  username?: string;
  mainCharacter?: string;
  favoriteTags?: string[];
  location?: string;
  website?: string;
  showNsfw?: boolean;
  showBirthdayOnProfile?: boolean;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  clearBirthDate?: boolean;
};

export async function patchProfile(body: PatchProfileBody) {
  return apiRequest<{ ok: boolean }>(MobileApi.me, {
    method: "PATCH",
    body,
    auth: true,
  });
}
