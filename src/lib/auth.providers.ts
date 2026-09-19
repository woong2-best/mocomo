import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getRequestIp } from "@/lib/request-ip";

const credentialsProvider = Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;
    const { authenticateCredentialsUser } = await import("@/lib/mobile-credentials-login");
    const ip = await getRequestIp();
    return authenticateCredentialsUser(
      String(credentials.email),
      String(credentials.password),
      ip
    );
  },
});

/**
 * Public signup/login: Google OAuth + credentials (username/email + password).
 * Credentials remain for legacy accounts and the sign-in form.
 * Live streaming OAuth (YouTube / Twitch / CHZZK) is separate — do not add here.
 */
export function getAuthProviders(): NonNullable<NextAuthConfig["providers"]> {
  const providers: NonNullable<NextAuthConfig["providers"]> = [credentialsProvider];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
        // Non-sensitive only — must match GCP OAuth consent "Data access" scopes.
        authorization: {
          params: {
            scope: "openid email profile",
            response_type: "code",
          },
        },
      })
    );
  } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
        authorization: {
          params: {
            scope: "openid email profile",
            response_type: "code",
          },
        },
      })
    );
  }

  return providers;
}
