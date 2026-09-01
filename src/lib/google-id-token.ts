import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleIdTokenClaims = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

/** Web OAuth client — also the `aud` native SDKs request via serverClientId. */
export function googleWebClientId(): string | null {
  return (
    process.env.AUTH_GOOGLE_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    null
  );
}

/** Android OAuth client — native SDK may use this as ID token `aud`. */
export function googleAndroidClientId(): string | null {
  return process.env.GOOGLE_ANDROID_CLIENT_ID?.trim() || null;
}

/**
 * the web client when `serverClientId` is set, but fall back to their own
 * platform client id when it is not.
 */
export function googleNativeAudiences(): string[] {
  const raw = [
    googleWebClientId(),
    googleAndroidClientId(),
    process.env.GOOGLE_IOS_CLIENT_ID?.trim(),
  ].filter((v): v is string => !!v);
  return [...new Set(raw)];
}

export async function verifyGoogleIdToken(
  idToken: string
): Promise<GoogleIdTokenClaims | null> {
  const audience = googleNativeAudiences();
  if (audience.length === 0) return null;

  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience,
    });

    const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!sub) return null;

    const emailRaw = typeof payload.email === "string" ? payload.email.trim() : "";
    const verified = payload.email_verified;

    return {
      sub,
      email: emailRaw ? emailRaw.toLowerCase() : null,
      emailVerified: verified === true || verified === "true",
      name: typeof payload.name === "string" ? payload.name.trim() || null : null,
      picture: typeof payload.picture === "string" ? payload.picture.trim() || null : null,
    };
  } catch {
    return null;
  }
}
