/**
 * @woong1 쇼케이스: 표시 팔로우 1만 + More Connect Moment 전체 연결(데모).
 *
 *   npx tsx scripts/bootstrap-woong1-showcase.ts
 */
import { db } from "../src/lib/db";
import { PROFILE_SOCIAL_PROVIDERS } from "../src/lib/profile-social";

const USERNAME = "woong1";
const DISPLAY_COUNT = 10_000;
const DEMO_PREFIX = "mocomo-demo-woong1";

async function upsertSocialAccount(userId: string, provider: string, handle: string) {
  const providerAccountId = `${DEMO_PREFIX}:${provider}`;
  await db.account.upsert({
    where: {
      provider_providerAccountId: { provider, providerAccountId },
    },
    create: {
      userId,
      type: "oauth",
      provider,
      providerAccountId,
      id_token: handle,
    },
    update: {
      userId,
      id_token: handle,
    },
  });
}

async function upsertStreaming(
  userId: string,
  platform: "YOUTUBE" | "TWITCH",
  channelId: string,
  channelName: string,
  channelUrl: string
) {
  await db.connectedStreamingAccount.upsert({
    where: {
      platform_channelId: { platform, channelId },
    },
    create: {
      userId,
      platform,
      channelId,
      channelName,
      channelUrl,
      verified: true,
      verificationMethod: "MANUAL_ADMIN",
      verifiedAt: new Date(),
    },
    update: {
      userId,
      channelName,
      channelUrl,
      verified: true,
      verificationMethod: "MANUAL_ADMIN",
      verifiedAt: new Date(),
      revokedAt: null,
      revokedReason: null,
    },
  });
}

async function main() {
  const user = await db.user.findFirst({
    where: { username: { equals: USERNAME, mode: "insensitive" } },
    select: { id: true, username: true, profile: { select: { snsLinks: true } } },
  });
  if (!user) {
    throw new Error(`User @${USERNAME} not found`);
  }

  const handle = user.username;
  const showSocial = Object.fromEntries(
    PROFILE_SOCIAL_PROVIDERS.map((id) => [id, true])
  ) as Record<(typeof PROFILE_SOCIAL_PROVIDERS)[number], boolean>;
  const snsBlob =
    user.profile?.snsLinks && typeof user.profile.snsLinks === "object" && !Array.isArray(user.profile.snsLinks)
      ? (user.profile.snsLinks as Record<string, unknown>)
      : {};

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayFollowerCount: DISPLAY_COUNT,
      displayFollowingCount: DISPLAY_COUNT,
      showYoutubeOnProfile: true,
      showTwitchOnProfile: true,
      snsLinks: { ...snsBlob, showSocial },
    },
    update: {
      displayFollowerCount: DISPLAY_COUNT,
      displayFollowingCount: DISPLAY_COUNT,
      showYoutubeOnProfile: true,
      showTwitchOnProfile: true,
      snsLinks: { ...snsBlob, showSocial },
    },
  });

  for (const provider of PROFILE_SOCIAL_PROVIDERS) {
    await upsertSocialAccount(user.id, provider, handle);
  }

  await upsertStreaming(
    user.id,
    "YOUTUBE",
    `${DEMO_PREFIX}-youtube`,
    handle,
    `https://www.youtube.com/@${encodeURIComponent(handle)}`
  );
  await upsertStreaming(
    user.id,
    "TWITCH",
    `${DEMO_PREFIX}-twitch`,
    handle,
    `https://www.twitch.tv/${encodeURIComponent(handle)}`
  );

  console.log(`OK: @${user.username} → display follows ${DISPLAY_COUNT}, all social + streaming demo links`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
