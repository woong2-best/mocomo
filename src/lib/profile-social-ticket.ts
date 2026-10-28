import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import type { ProfileSocialId } from "@/lib/profile-social";
import { PROFILE_SOCIAL_PROVIDERS } from "@/lib/profile-social";

const TTL_MS = 10 * 60 * 1000;

export type ProfileSocialTicket = {
  userId: string;
  provider: ProfileSocialId;
};

export function sanitizeLinkUserId(raw?: string | null): string | undefined {
  const v = raw?.trim();
  if (!v || v.length < 8 || v.length > 64) return undefined;
  if (!/^[a-zA-Z0-9_-]+$/.test(v)) return undefined;
  return v;
}

function secret(): string {
  const s = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!s) throw new Error("AUTH_SECRET required");
  return `profile-social-ticket:${s}`;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function mintProfileSocialTicket(ticket: ProfileSocialTicket): string {
  const body = Buffer.from(
    JSON.stringify({ ...ticket, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyProfileSocialTicket(raw: string | null): ProfileSocialTicket | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      userId?: string;
      provider?: string;
      exp?: number;
    };
    const userId = sanitizeLinkUserId(payload.userId);
    const provider = payload.provider;
    if (!userId || !provider || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    if (!(PROFILE_SOCIAL_PROVIDERS as readonly string[]).includes(provider)) return null;
    return { userId, provider: provider as ProfileSocialId };
  } catch {
    return null;
  }
}

export const MOBILE_SOCIAL_RETURN_TO = "/auth/mobile/social-connected";

export function ticketFromRequest(
  req: NextRequest,
  provider: ProfileSocialId
): ProfileSocialTicket | null {
  const ticket = verifyProfileSocialTicket(req.nextUrl.searchParams.get("link"));
  if (!ticket || ticket.provider !== provider) return null;
  return ticket;
}
