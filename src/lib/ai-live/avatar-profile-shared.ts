import {
  AVATAR_ACCOUNTS,
  type AvatarAccountId,
  type AvatarAccountDef,
} from "@/lib/ai-live/official-channel-id";

export type AvatarPublicProfile = {
  id: AvatarAccountId;
  username: string;
  name: string;
  image: string | null;
};

export type AvatarUserRow = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

/** Hardcoded live posters — never treat these as a user's profile photo. */
const STOCK_LIVE_AVATAR_IMAGES = new Set([
  "/live/moco-poster.png",
  "/live/idols/airi.jpg",
  "/live/idols/chloe.jpg",
  "/live/idols/stella.jpg",
]);

export function profileImageForLiveAvatar(image: string | null | undefined): string | null {
  const raw = image?.trim() || "";
  if (!raw || STOCK_LIVE_AVATAR_IMAGES.has(raw)) return null;
  return raw;
}

function defaultProfiles(): Record<AvatarAccountId, AvatarPublicProfile> {
  return Object.fromEntries(
    AVATAR_ACCOUNTS.map((account) => [
      account.id,
      {
        id: account.id,
        username: account.username,
        name: account.name,
        image: null,
      } satisfies AvatarPublicProfile,
    ])
  ) as Record<AvatarAccountId, AvatarPublicProfile>;
}

function applyUser(
  profile: AvatarPublicProfile,
  user: AvatarUserRow,
  fallbackName: string
): AvatarPublicProfile {
  return {
    ...profile,
    username: user.username,
    name: user.name?.trim() || fallbackName,
    image: profileImageForLiveAvatar(user.image),
  };
}

export function mergeAvatarPublicProfiles(
  accounts: readonly AvatarAccountDef[],
  users: AvatarUserRow[],
  channelOwnerIds: ReadonlyMap<string, string>
): Record<AvatarAccountId, AvatarPublicProfile> {
  const next = defaultProfiles();
  const byId = new Map(users.map((user) => [user.id, user]));
  const byUsername = new Map(users.map((user) => [user.username.trim().toLowerCase(), user]));

  for (const account of accounts) {
    const ownerId = channelOwnerIds.get(account.channelId);
    const user = (ownerId ? byId.get(ownerId) : undefined) ?? byUsername.get(account.username);
    if (user) next[account.id] = applyUser(next[account.id]!, user, account.name);
  }

  return next;
}
