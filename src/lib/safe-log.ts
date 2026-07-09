/** 로그에 PII·시크릿이 남지 않도록 최소 정보만 기록 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const TOKEN_KEYS = new Set([
  "password",
  "passwordHash",
  "access_token",
  "refresh_token",
  "id_token",
  "token",
  "secret",
  "apiKey",
  "authorization",
]);

export function redactEmail(email: string | null | undefined): string {
  if (!email?.trim()) return "[no-email]";
  const at = email.indexOf("@");
  if (at <= 1) return "***@***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

export function redactToken(value: string | null | undefined): string {
  if (!value?.trim()) return "[empty]";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function sanitizeValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (TOKEN_KEYS.has(key) || TOKEN_KEYS.has(lower)) {
    return typeof value === "string" ? redactToken(value) : "[redacted]";
  }
  if (lower.includes("email") && typeof value === "string") {
    return redactEmail(value);
  }
  if (typeof value === "string") {
    return value.replace(EMAIL_RE, (m) => redactEmail(m)).replace(BEARER_RE, "Bearer [redacted]");
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => sanitizeValue(String(i), v));
  }
  if (value && typeof value === "object") {
    return sanitizeRecord(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizeRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = sanitizeValue(key, value);
  }
  return out;
}

export function safeLogInfo(scope: string, payload: Record<string, unknown>): void {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope,
      ...sanitizeRecord(payload),
    })
  );
}

export function safeLogWarn(scope: string, payload: Record<string, unknown>): void {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope,
      ...sanitizeRecord(payload),
    })
  );
}
