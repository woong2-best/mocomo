import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { fetchUserProfile } from "@/api/social";
import { prefetchImageUrls } from "@/perf/image";
import type { RootStackParamList } from "@/navigation/types";

/** Identity already visible on a feed card, chat row, or search hit. */
export type UserProfileSeed = {
  username: string;
  name?: string | null;
  image?: string | null;
};

export const USER_PROFILE_STALE_MS = 60_000;

export function userProfileQueryKey(username: string) {
  return ["mobile-user", username] as const;
}

let profileScreenWarmed = false;

/** Parse the profile screen during touch-down so the push animation does not pay for it. */
export function warmUserProfileScreen() {
  if (profileScreenWarmed) return;
  try {
    require("@/features/profile/UserProfileScreen");
    profileScreenWarmed = true;
  } catch {
    // The stack still loads the screen on navigate.
  }
}

export function prefetchUserProfile(queryClient: QueryClient, seed: UserProfileSeed) {
  const username = seed.username.trim();
  if (!username || username === "anonymous") return;
  warmUserProfileScreen();
  if (seed.image) prefetchImageUrls([seed.image], 1);
  void queryClient.prefetchQuery({
    queryKey: userProfileQueryKey(username),
    queryFn: () => fetchUserProfile(username),
    staleTime: USER_PROFILE_STALE_MS,
  });
}

export function openUserProfile(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  seed: UserProfileSeed
) {
  navigation.navigate({
    name: "UserProfile",
    params: {
      username: seed.username.trim(),
      name: seed.name ?? null,
      image: seed.image ?? null,
    },
    merge: false,
  });
}

export function useUserProfileNav() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (seed: UserProfileSeed) => {
      prefetchUserProfile(queryClient, seed);
    },
    [queryClient]
  );

  const open = useCallback(
    (seed: UserProfileSeed) => {
      openUserProfile(navigation, seed);
    },
    [navigation]
  );

  return { prefetch, open };
}
