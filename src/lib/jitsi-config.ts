export function getJitsiDomain(): string {
  const raw = process.env.NEXT_PUBLIC_JITSI_DOMAIN?.trim() || "meet.jit.si";
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function getJitsiRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX?.trim() || "mocomo-";
}

export function getJitsiAppId(): string | null {
  const id = process.env.JITSI_APP_ID?.trim();
  return id || null;
}

/** JaaS API key id for JWT header `kid` (e.g. vpaas-magic-cookie-…/abcd12). */
export function getJitsiApiKey(): string | null {
  const key = process.env.JITSI_API_KEY?.trim();
  return key || null;
}

export function getJitsiAppSecret(): string | null {
  const secret = process.env.JITSI_APP_SECRET?.trim();
  return secret || null;
}

/** PEM private keys in env often use literal \\n — normalize before importPKCS8. */
export function normalizeJitsiSecret(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

export function isPemPrivateKey(secret: string): boolean {
  const normalized = normalizeJitsiSecret(secret);
  return (
    normalized.includes("BEGIN PRIVATE KEY") || normalized.includes("BEGIN RSA PRIVATE KEY")
  );
}

export function isJitsiJwtConfigured(): boolean {
  return !!(getJitsiAppId() && getJitsiAppSecret());
}

export function isJaasJwtReady(): boolean {
  return isJitsiJwtConfigured() && !!getJitsiApiKey();
}

export function isPublicMeetJitSi(): boolean {
  return getJitsiDomain() === "meet.jit.si";
}

export function isJaasDeployment(): boolean {
  const appId = getJitsiAppId() ?? "";
  if (appId.startsWith("vpaas-magic-cookie")) return true;
  const domain = getJitsiDomain();
  return domain === "8x8.vc" || domain.endsWith(".8x8.vc");
}

function baseRoomName(channelId: string): string {
  return `${getJitsiRoomPrefix()}${channelId}`;
}

/** Room path passed to JitsiMeeting / join URL (JaaS prefixes app id). */
export function buildJitsiRoomName(channelId: string): string {
  const base = baseRoomName(channelId);
  const appId = getJitsiAppId();
  if (isJaasDeployment() && appId) {
    return `${appId}/${base}`;
  }
  return base;
}

export function isJitsiConfigured(): boolean {
  const domain = getJitsiDomain();
  if (!domain || isPublicMeetJitSi()) return false;
  if (isJaasDeployment() && !isJaasJwtReady()) return false;
  return true;
}

export const JITSI_PUBLIC_MEET_ERROR =
  "공개 meet.jit.si는 임베드 음성 방을 지원하지 않습니다. 8x8 JaaS(8x8.vc) 또는 자체 Jitsi 서버를 NEXT_PUBLIC_JITSI_DOMAIN에 설정하세요.";

export const JITSI_JAAS_CREDENTIALS_ERROR =
  "8x8 JaaS를 사용하려면 NEXT_PUBLIC_JITSI_DOMAIN=8x8.vc, JITSI_APP_ID, JITSI_API_KEY(kid), JITSI_APP_SECRET(RSA PEM)을 설정하세요.";
