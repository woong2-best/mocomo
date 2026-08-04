-- Connected streaming accounts — OAuth / manual verification before external live donations

CREATE TYPE "StreamingPlatform" AS ENUM (
  'YOUTUBE',
  'TWITCH',
  'CHZZK',
  'KICK',
  'AFREECA',
  'SOOP',
  'FACEBOOK',
  'TIKTOK',
  'OTHER'
);

CREATE TYPE "StreamingVerificationMethod" AS ENUM (
  'OAUTH',
  'PROFILE_CODE',
  'DESCRIPTION_CODE',
  'STREAM_TITLE',
  'MANUAL_ADMIN'
);

CREATE TABLE "ConnectedStreamingAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" "StreamingPlatform" NOT NULL,
  "channelId" VARCHAR(128) NOT NULL,
  "channelName" VARCHAR(200) NOT NULL,
  "channelUrl" VARCHAR(500) NOT NULL,
  "profileImage" VARCHAR(500),
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verificationMethod" "StreamingVerificationMethod",
  "verificationCode" VARCHAR(32),
  "verifiedAt" TIMESTAMP(3),
  "encryptedTokenData" TEXT,
  "encryptionIv" TEXT,
  "encryptionAuthTag" TEXT,
  "encryptionKeyId" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConnectedStreamingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StreamingAccountVerificationLog" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "method" "StreamingVerificationMethod",
  "success" BOOLEAN NOT NULL DEFAULT true,
  "detail" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StreamingAccountVerificationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VoiceChannel"
  ADD COLUMN "externalChannelId" VARCHAR(128),
  ADD COLUMN "connectedStreamingAccountId" TEXT;

CREATE UNIQUE INDEX "ConnectedStreamingAccount_platform_channelId_key"
  ON "ConnectedStreamingAccount"("platform", "channelId");

CREATE INDEX "ConnectedStreamingAccount_userId_platform_idx"
  ON "ConnectedStreamingAccount"("userId", "platform");

CREATE INDEX "ConnectedStreamingAccount_userId_verified_idx"
  ON "ConnectedStreamingAccount"("userId", "verified");

CREATE INDEX "StreamingAccountVerificationLog_accountId_createdAt_idx"
  ON "StreamingAccountVerificationLog"("accountId", "createdAt" DESC);

CREATE INDEX "StreamingAccountVerificationLog_action_createdAt_idx"
  ON "StreamingAccountVerificationLog"("action", "createdAt" DESC);

ALTER TABLE "ConnectedStreamingAccount"
  ADD CONSTRAINT "ConnectedStreamingAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StreamingAccountVerificationLog"
  ADD CONSTRAINT "StreamingAccountVerificationLog_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "ConnectedStreamingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoiceChannel"
  ADD CONSTRAINT "VoiceChannel_connectedStreamingAccountId_fkey"
  FOREIGN KEY ("connectedStreamingAccountId") REFERENCES "ConnectedStreamingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
