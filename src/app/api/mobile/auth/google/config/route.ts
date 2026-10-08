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
  const rawIos =
    process.env.GOOGLE_IOS_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
    null;
  // A Web client id used as iosClientId makes GIDSignIn open
  // `com.googleusercontent.apps.*` — Google then shows
  // "Custom scheme URLs are not allowed for 'WEB' client type".
  const iosClientId = rawIos && rawIos !== webClientId ? rawIos : null;

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
