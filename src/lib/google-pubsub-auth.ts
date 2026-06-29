import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** Google Pub/Sub push OIDC 또는 공유 시크릿으로 RTDN 엔드포인트 인증 */
export async function verifyGooglePubSubPush(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  const sharedSecret = process.env.GOOGLE_RTDN_SECRET ?? process.env.CRON_SECRET;
  if (sharedSecret && token === sharedSecret) return true;

  const audience =
    process.env.GOOGLE_RTDN_AUDIENCE ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (!audience) return false;

  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    return email.endsWith("@gcp-sa-pubsub.iam.gserviceaccount.com");
  } catch {
    return false;
  }
}
