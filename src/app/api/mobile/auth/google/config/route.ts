import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import { googleAndroidClientId, googleWebClientId } from "@/lib/google-id-token";

/**
 * Public client ids for the native Google Sign-In SDK. OAuth client ids are not
 * secrets — shipping them from the server keeps the app binary free of
 * environment-specific config.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-google-config", 60);
  if (limited) return limited;

  const webClientId = googleWebClientId();
  const androidClientId = googleAndroidClientId();
  const iosClientId = process.env.GOOGLE_IOS_CLIENT_ID?.trim() || null;

  return NextResponse.json(
    {
      enabled: !!webClientId && isOAuthEncryptionConfigured(),
      webClientId,
      androidClientId,
      iosClientId,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
