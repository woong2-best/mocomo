import { db } from "@/lib/db";
import { decryptOAuthPayload, isOAuthVaultProvider } from "@/lib/oauth-vault";
import { isFacebookOAuthConfigured } from "@/lib/facebook-oauth";
import { isInstagramOAuthConfigured } from "@/lib/instagram-oauth";

export const PROFILE_SOCIAL_PROVIDERS = [
  "facebook",
  "instagram",
  "twitter",
  "naver",
] as const;

export type ProfileSocialId = (typeof PROFILE_SOCIAL_PROVIDERS)[number];

export type ProfileSocialLink = {
  id: ProfileSocialId;
  href: string | null;
  label: string;
  iconSrc: string;
};

const META: Record<
  ProfileSocialId,
  { label: string; iconSrc: string }
> = {
  facebook: { label: "Facebook", iconSrc: "/brand/facebook.svg" },
  instagram: { label: "Instagram", iconSrc: "/brand/instagram.svg" },
  twitter: { label: "X", iconSrc: "/brand/twitter.svg" },
  naver: { label: "CHZZK", iconSrc: "/brand/chzzk.png" },
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

export function getProfileSocialConnectAvailability() {
  return {
    facebook: isFacebookOAuthConfigured(),
    instagram: isInstagramOAuthConfigured(),
    twitter: isTwitterOAuthConfigured(),
    naver: isNaverOAuthConfigured(),
  };
}

export async function listProfileSocialLinks(userId: string): Promise<ProfileSocialLink[]> {
  const rows = await db.account.findMany({
    where: { userId, provider: { in: [...PROFILE_SOCIAL_PROVIDERS] } },
    select: {
      provider: true,
      providerAccountId: true,
      encryptedGoogleData: true,
      encryptionIv: true,
      encryptionAuthTag: true,
      encryptionKeyId: true,
    },
  });

  const links: ProfileSocialLink[] = [];
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
    }
    links.push({
      id,
      href: hrefFor(id, sub, handle),
      ...META[id],
    });
  }
  return links;
}

export async function listConnectedProfileSocialIds(userId: string): Promise<ProfileSocialId[]> {
  const rows = await db.account.findMany({
    where: { userId, provider: { in: [...PROFILE_SOCIAL_PROVIDERS] } },
    select: { provider: true },
  });
  return PROFILE_SOCIAL_PROVIDERS.filter((id) => rows.some((r) => r.provider === id));
}

export const PROFILE_SOCIAL_CONNECT_PATH: Record<ProfileSocialId, string> = {
  facebook: "/api/auth/facebook",
  instagram: "/api/auth/instagram",
  twitter: "/api/auth/twitter",
  naver: "/api/auth/naver",
};
