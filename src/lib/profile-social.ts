import { db } from "@/lib/db";
import { decryptOAuthPayload, isOAuthVaultProvider } from "@/lib/oauth-vault";
import { isFacebookOAuthConfigured } from "@/lib/facebook-oauth";
import { isInstagramOAuthConfigured } from "@/lib/instagram-oauth";
import { isYoutubeStreamingOAuthConfigured } from "@/lib/streaming-accounts/providers/youtube";
import { isTwitchStreamingOAuthConfigured } from "@/lib/streaming-accounts/providers/twitch";

export const PROFILE_SOCIAL_PROVIDERS = [
  "facebook",
  "instagram",
  "twitter",
  "naver",
  "tiktok",
] as const;

export const PROFILE_STREAMING_SOCIAL_IDS = ["youtube", "twitch"] as const;

export type ProfileSocialId = (typeof PROFILE_SOCIAL_PROVIDERS)[number];
export type ProfileStreamingSocialId = (typeof PROFILE_STREAMING_SOCIAL_IDS)[number];
export type ProfileConnectId = ProfileSocialId | ProfileStreamingSocialId;

export type ProfileSocialLink = {
  id: ProfileConnectId;
  href: string | null;
  label: string;
  iconSrc: string;
};

const META: Record<
  ProfileConnectId,
  { label: string; iconSrc: string }
> = {
  youtube: { label: "YouTube", iconSrc: "/brand/youtube.svg" },
  twitch: { label: "Twitch", iconSrc: "/brand/twitch.svg" },
  facebook: { label: "Facebook", iconSrc: "/brand/facebook.png" },
  instagram: { label: "Instagram", iconSrc: "/brand/instagram.png" },
  twitter: { label: "X", iconSrc: "/brand/twitter.png" },
  naver: { label: "CHZZK", iconSrc: "/brand/chzzk.png" },
  tiktok: { label: "TikTok", iconSrc: "/brand/tiktok.png" },
};

const STREAMING_PLATFORM: Record<ProfileStreamingSocialId, "YOUTUBE" | "TWITCH"> = {
  youtube: "YOUTUBE",
  twitch: "TWITCH",
};

function hrefFor(id: ProfileSocialId, sub: string | null, handle: string | null): string | null {
  if (id === "instagram" && handle) {
    return `https://www.instagram.com/${encodeURIComponent(handle.replace(/^@/, ""))}/`;
  }
  if (id === "twitter" && handle) {
    return `https://x.com/${encodeURIComponent(handle.replace(/^@/, ""))}`;
  }
  if (id === "facebook" && sub) {
    return `https://www.facebook.com/${encodeURIComponent(sub)}`;
  }
  if (id === "naver") {
    return handle
      ? `https://chzzk.naver.com/search?query=${encodeURIComponent(handle)}`
      : "https://chzzk.naver.com";
  }
  if (id === "tiktok") {
    const raw = handle?.replace(/^@/, "").trim() ?? "";
    if (raw && /^[A-Za-z0-9._]+$/.test(raw)) {
      return `https://www.tiktok.com/@${encodeURIComponent(raw)}`;
    }
    return raw
      ? `https://www.tiktok.com/search/user?q=${encodeURIComponent(raw)}`
      : "https://www.tiktok.com";
  }
  return null;
}

export function isTwitterOAuthConfigured(): boolean {
  return Boolean(
    (process.env.AUTH_TWITTER_ID?.trim() || process.env.TWITTER_CLIENT_ID?.trim()) &&
      (process.env.AUTH_TWITTER_SECRET?.trim() || process.env.TWITTER_CLIENT_SECRET?.trim())
  );
}

export function isNaverOAuthConfigured(): boolean {
  return Boolean(
    (process.env.AUTH_NAVER_ID?.trim() ||
      process.env.NAVER_CLIENT_ID?.trim() ||
      process.env.NAVER_ID?.trim()) &&
      (process.env.AUTH_NAVER_SECRET?.trim() ||
        process.env.NAVER_CLIENT_SECRET?.trim() ||
        process.env.NAVER_SECRET?.trim())
  );
}

export function isTikTokOAuthConfigured(): boolean {
  return Boolean(
    (process.env.TIKTOK_CLIENT_KEY?.trim() ||
      process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY?.trim() ||
      process.env.AUTH_TIKTOK_ID?.trim() ||
      process.env.TIKTOK_CLIENT_ID?.trim()) &&
      (process.env.TIKTOK_CLIENT_SECRET?.trim() || process.env.AUTH_TIKTOK_SECRET?.trim())
  );
}

export function getProfileSocialConnectAvailability(): Record<ProfileSocialId, boolean> {
  return {
    facebook: isFacebookOAuthConfigured(),
    instagram: isInstagramOAuthConfigured(),
    twitter: isTwitterOAuthConfigured(),
    naver: isNaverOAuthConfigured(),
    tiktok: isTikTokOAuthConfigured(),
  };
}

export function getProfileConnectAvailability(): Record<ProfileConnectId, boolean> {
  return {
    youtube: isYoutubeStreamingOAuthConfigured(),
    twitch: isTwitchStreamingOAuthConfigured(),
    ...getProfileSocialConnectAvailability(),
  };
}

export type ProfileSocialItem = ProfileSocialLink & {
  displayed: boolean;
};

type SnsBlob = {
  location?: string;
  website?: string;
  showSocial?: Partial<Record<ProfileSocialId, boolean>>;
};

function asSnsBlob(raw: unknown): SnsBlob {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as SnsBlob;
}

export function readSocialDisplay(raw: unknown): Record<ProfileSocialId, boolean> {
  const shown = asSnsBlob(raw).showSocial ?? {};
  return {
    facebook: shown.facebook === true,
    instagram: shown.instagram === true,
    twitter: shown.twitter === true,
    naver: shown.naver === true,
    tiktok: shown.tiktok === true,
  };
}

async function loadConnectedSocialItems(userId: string): Promise<ProfileSocialItem[]> {
  const [rows, profile] = await Promise.all([
    db.account.findMany({
      where: { userId, provider: { in: [...PROFILE_SOCIAL_PROVIDERS] } },
      select: {
        provider: true,
        providerAccountId: true,
        id_token: true,
        encryptedGoogleData: true,
        encryptionIv: true,
        encryptionAuthTag: true,
        encryptionKeyId: true,
      },
    }),
    db.profile.findUnique({
      where: { userId },
      select: { snsLinks: true },
    }),
  ]);
  const displayed = readSocialDisplay(profile?.snsLinks);
  const items: ProfileSocialItem[] = [];
  for (const id of PROFILE_SOCIAL_PROVIDERS) {
    const row = rows.find((r) => r.provider === id);
    if (!row) continue;
    let sub: string | null = null;
    let handle: string | null = null;
    if (isOAuthVaultProvider(row.provider)) {
      const payload = decryptOAuthPayload(row.provider, row);
      sub = payload?.sub ?? null;
      handle = payload?.name ?? null;
    } else {
      sub = row.providerAccountId;
      handle = row.id_token?.trim() || null;
    }
    items.push({
      id,
      href: hrefFor(id, sub, handle),
      displayed: displayed[id],
      ...META[id],
    });
  }
  return items;
}

async function loadStreamingSocialItems(userId: string): Promise<ProfileSocialItem[]> {
  const [profile, rows] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
      select: { showYoutubeOnProfile: true, showTwitchOnProfile: true },
    }),
    db.connectedStreamingAccount.findMany({
      where: {
        userId,
        platform: { in: ["YOUTUBE", "TWITCH"] },
        verified: true,
        revokedAt: null,
      },
      select: { platform: true, channelUrl: true },
    }),
  ]);
  const items: ProfileSocialItem[] = [];
  for (const id of PROFILE_STREAMING_SOCIAL_IDS) {
    const row = rows.find((r) => r.platform === STREAMING_PLATFORM[id]);
    if (!row) continue;
    const displayed =
      id === "youtube"
        ? profile?.showYoutubeOnProfile === true
        : profile?.showTwitchOnProfile === true;
    items.push({
      id,
      href: row.channelUrl,
      displayed,
      ...META[id],
    });
  }
  return items;
}

export async function listProfileSocialLinks(userId: string): Promise<ProfileSocialLink[]> {
  const [social, streaming] = await Promise.all([
    loadConnectedSocialItems(userId),
    loadStreamingSocialItems(userId),
  ]);
  return [
    ...streaming.filter((item) => item.displayed),
    ...social,
  ].map(({ displayed: _shown, ...link }) => link);
}

export async function listProfileSocialManageItems(userId: string): Promise<ProfileSocialItem[]> {
  const [streaming, social] = await Promise.all([
    loadStreamingSocialItems(userId),
    loadConnectedSocialItems(userId),
  ]);
  return [...streaming, ...social];
}

export async function listConnectedProfileSocialIds(userId: string): Promise<ProfileConnectId[]> {
  const [socialRows, streamingItems] = await Promise.all([
    db.account.findMany({
      where: { userId, provider: { in: [...PROFILE_SOCIAL_PROVIDERS] } },
      select: { provider: true },
    }),
    loadStreamingSocialItems(userId),
  ]);
  const social = PROFILE_SOCIAL_PROVIDERS.filter((id) =>
    socialRows.some((r) => r.provider === id)
  );
  const streaming = PROFILE_STREAMING_SOCIAL_IDS.filter((id) =>
    streamingItems.some((item) => item.id === id && item.displayed)
  );
  return [...streaming, ...social];
}

export async function enableStreamingOnProfile(
  userId: string,
  id: ProfileStreamingSocialId
): Promise<void> {
  const data =
    id === "youtube"
      ? { showYoutubeOnProfile: true }
      : { showTwitchOnProfile: true };
  await db.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function setProfileSocialDisplayed(
  userId: string,
  id: ProfileSocialId,
  displayed: boolean
): Promise<void> {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { snsLinks: true },
  });
  const blob = asSnsBlob(profile?.snsLinks);
  const showSocial = { ...(blob.showSocial ?? {}), [id]: displayed };
  await db.profile.upsert({
    where: { userId },
    create: {
      userId,
      snsLinks: { ...blob, showSocial },
    },
    update: {
      snsLinks: { ...blob, showSocial },
    },
  });
}

export const PROFILE_SOCIAL_CONNECT_PATH: Record<ProfileSocialId, string> = {
  facebook: "/api/auth/facebook",
  instagram: "/api/auth/instagram",
  twitter: "/api/auth/twitter",
  naver: "/api/auth/naver",
  tiktok: "/api/auth/tiktok",
};
