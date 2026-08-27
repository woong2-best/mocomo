import { SignJWT } from "jose";
import {
  getJitsiAppId,
  getJitsiAppSecret,
  getJitsiDomain,
  isJaasDeployment,
  isJitsiJwtConfigured,
} from "@/lib/jitsi-config";

const JITSI_JWT_TTL = "2h";

function jwtSecret(): Uint8Array {
  const secret = getJitsiAppSecret();
  if (!secret) {
    throw new Error("JITSI_APP_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

/** HS256 JWT for 8x8 JaaS or self-hosted Jitsi with app secret auth. */
export async function signJitsiCommunityJwt(opts: {
  roomName: string;
  userId: string;
  displayName: string;
  moderator: boolean;
}): Promise<string | null> {
  if (!isJitsiJwtConfigured()) return null;

  const appId = getJitsiAppId();
  if (!appId) return null;

  const domain = getJitsiDomain();
  const jaas = isJaasDeployment();
  const roomClaim = jaas ? opts.roomName.split("/").pop() ?? opts.roomName : opts.roomName;

  const payload = {
    aud: "jitsi",
    iss: jaas ? "chat" : appId,
    sub: jaas ? appId : domain,
    room: roomClaim,
    context: {
      user: {
        id: opts.userId,
        name: opts.displayName,
        email: `${opts.userId.slice(0, 32)}@mocomo.local`,
        moderator: opts.moderator ? "true" : "false",
      },
    },
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JITSI_JWT_TTL)
    .sign(jwtSecret());
}
