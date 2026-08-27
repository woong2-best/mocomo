import { SignJWT, importPKCS8 } from "jose";
import {
  getJitsiApiKey,
  getJitsiAppId,
  getJitsiAppSecret,
  getJitsiDomain,
  isJaasDeployment,
  isJitsiJwtConfigured,
  isPemPrivateKey,
  normalizeJitsiSecret,
} from "@/lib/jitsi-config";

const JITSI_JWT_TTL = "2h";
const JITSI_JWT_NBF_SKEW_SEC = 10;

/** RS256 (JaaS PEM) or HS256 (self-hosted shared secret) JWT for Jitsi embed. */
export async function signJitsiCommunityJwt(opts: {
  roomName: string;
  userId: string;
  displayName: string;
  moderator: boolean;
}): Promise<string | null> {
  if (!isJitsiJwtConfigured()) return null;

  const appId = getJitsiAppId();
  const secret = getJitsiAppSecret();
  if (!appId || !secret) return null;

  const jaas = isJaasDeployment();
  if (jaas && !getJitsiApiKey()) return null;

  const domain = getJitsiDomain();
  const roomClaim = jaas ? "*" : opts.roomName.split("/").pop() ?? opts.roomName;

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

  const normalizedSecret = normalizeJitsiSecret(secret);
  const useRs256 = jaas || isPemPrivateKey(normalizedSecret);

  const signer = useRs256
    ? await importPKCS8(normalizedSecret, "RS256")
    : new TextEncoder().encode(normalizedSecret);

  const header = useRs256
    ? { alg: "RS256" as const, typ: "JWT" as const, kid: getJitsiApiKey()! }
    : { alg: "HS256" as const };

  const builder = new SignJWT(payload)
    .setProtectedHeader(header)
    .setIssuedAt()
    .setExpirationTime(JITSI_JWT_TTL);

  if (useRs256) {
    const nbf = Math.floor(Date.now() / 1000) - JITSI_JWT_NBF_SKEW_SEC;
    builder.setNotBefore(nbf);
  }

  return builder.sign(signer);
}
