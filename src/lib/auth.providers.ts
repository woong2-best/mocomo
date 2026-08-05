import type { NextAuthConfig } from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Twitter from "next-auth/providers/twitter";
import Credentials from "next-auth/providers/credentials";
import { getRequestIp } from "@/lib/request-ip";

/** LINE 웹 로그인 — OIDC discovery(ES256)와 실제 id_token(HS256) 불일치 회피용 OAuth */
type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

function LineOAuth(options: {
  clientId: string;
  clientSecret: string;
}): OAuthConfig<LineProfile> {
  return {
    id: "line",
    name: "LINE",
    type: "oauth",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: "https://access.line.me/oauth2/v2.1/authorize",
      params: { scope: "profile openid", response_type: "code" },
    },
    token: "https://api.line.me/oauth2/v2.1/token",
    userinfo: "https://api.line.me/v2/profile",
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    checks: ["state"],
    profile(profile) {
      return {
        id: profile.userId,
        name: profile.displayName,
        email: null,
        image: profile.pictureUrl ?? null,
      };
    },
    style: { bg: "#06C755", text: "#fff" },
  };
}
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

/** OAuth 프로바이더 — Google만 verified-email linking 허용 (signIn 콜백에서 재검증) */
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

  if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
    providers.push(
      Discord({
        clientId: process.env.AUTH_DISCORD_ID,
        clientSecret: process.env.AUTH_DISCORD_SECRET,
        authorization: {
          params: { scope: "identify email" },
        },
      })
    );
  }

  if (process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET) {
    providers.push(
      Twitter({
        clientId: process.env.AUTH_TWITTER_ID,
        clientSecret: process.env.AUTH_TWITTER_SECRET,
        authorization: {
          url: "https://x.com/i/oauth2/authorize",
          params: { scope: "users.read" },
        },
      })
    );
  }

  const lineId =
    process.env.AUTH_LINE_ID?.trim() || process.env.LINE_CLIENT_ID?.trim();
  const lineSecret =
    process.env.AUTH_LINE_SECRET?.trim() || process.env.LINE_CLIENT_SECRET?.trim();
  if (lineId && lineSecret) {
    providers.push(
      LineOAuth({
        clientId: lineId,
        clientSecret: lineSecret,
      })
    );
  }

  return providers;
}
