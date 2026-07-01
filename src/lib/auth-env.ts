const MIN_SECRET_LENGTH = 32;

export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

export function getAuthUrl(): string | undefined {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  );
}

export function getAuthConfigStatus() {
  const secret = getAuthSecret();
  const secretLength = secret?.length ?? 0;
  const googleId = process.env.AUTH_GOOGLE_ID?.trim();
  const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim();

  return {
    secretConfigured: secretLength > 0,
    secretLengthOk: secretLength >= MIN_SECRET_LENGTH,
    authUrl: getAuthUrl() ?? null,
    trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.VERCEL === "1",
    googleOAuth: !!(googleId && googleSecret),
    googleIdPresent: !!googleId,
    googleSecretPresent: !!googleSecret,
    googleIdLength: googleId?.length ?? 0,
    googleSecretLength: googleSecret?.length ?? 0,
    discordOAuth: !!(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET),
    twitterOAuth: !!(process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET),
    databaseUrlConfigured: !!process.env.DATABASE_URL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  };
}

export function isAuthConfigured(): boolean {
  const status = getAuthConfigStatus();
  return status.secretConfigured && status.secretLengthOk && status.databaseUrlConfigured;
}
