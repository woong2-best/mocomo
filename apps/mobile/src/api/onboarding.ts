import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type OnboardingCosplayer = {
  userId: string;
  username: string;
  displayName: string;
  image: string | null;
  photoUrl: string | null;
  bio: string | null;
  followerCount: number;
  following: boolean;
};

export async function fetchOnboardingCosplayers(take = 24) {
  return apiRequest<{ items: OnboardingCosplayer[] }>(
    `${MobileApi.onboardingCosplayers}?take=${take}`,
    { auth: true }
  );
}

export async function applyAsCosplayerMobile(input: { bio: string; photoUrl: string }) {
  return apiRequest<{ success?: boolean; username?: string; error?: string }>(
    MobileApi.cosplayApply,
    {
      method: "POST",
      body: input,
    }
  );
}
