import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 15 * 60 * 1000;

type StatePayload = {
  userId: string;
  platform: string;
  nonce: string;
  exp: number;
};

function stateSecret(): string {
  const s =
    process.env.STREAMING_OAUTH_STATE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.OAUTH_ENCRYPTION_KEY?.trim();
  if (!s) throw new Error("AUTH_SECRET or STREAMING_OAUTH_STATE_SECRET required");
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function mintStreamingOAuthState(userId: string, platform: string): string {
  const payload: StatePayload = {
    userId,
    platform,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyStreamingOAuthState(
  state: string,
  expectedPlatform: string
): { userId: string } | { error: string } {
  const parts = state.split(".");
  if (parts.length !== 2) return { error: "Invalid OAuth state." };
  const [body, sig] = parts;
  if (!body || !sig) return { error: "Invalid OAuth state." };
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { error: "OAuth state signature is invalid." };
    }
  } catch {
    return { error: "OAuth state signature is invalid." };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as StatePayload;
    if (payload.exp < Date.now()) return { error: "OAuth session expired." };
    if (payload.platform !== expectedPlatform) {
      return { error: "Platform does not match." };
    }
    if (!payload.userId) return { error: "User information is missing." };
    return { userId: payload.userId };
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

export function generateVerificationCode(): string {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `MOCOMO-${hex}`;
}

export function streamingOAuthRedirectUri(platform: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "") ||
    "https://mocomo.net";
  return `${base.replace(/\/$/, "")}/api/streaming-accounts/callback/${platform.toLowerCase()}`;
}
