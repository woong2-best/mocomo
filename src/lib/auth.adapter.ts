import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { db } from "@/lib/db";
import {
  containsForbiddenAdminSequence,
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
  validateUsernameAndName,
} from "@/lib/forbidden-admin-sequence";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import {
  findOAuthAccountBySub,
  findUserIdByOAuthEmail,
  isOAuthVaultProvider,
  persistEncryptedOAuthAccount,
} from "@/lib/oauth-vault";

async function generateUniqueUsername(seed: string): Promise<string> {
  let base = seed
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);

  if (base.length < 3) base = `user_${base}`.slice(0, 16);
  if (base.length < 3) base = "user";

  let username = base;
  let suffix = 0;

  while (
    (await db.user.findUnique({ where: { username }, select: { id: true } })) ||
    containsForbiddenAdminSequence(username)
  ) {
    suffix += 1;
    username = `${base.slice(0, Math.max(3, 16 - String(suffix).length))}${suffix}`;
  }

  return username;
}

function toAdapterUser(user: {
  id: string;
  email: string | null;
  emailVerified: Date | null;
  name: string | null;
  image: string | null;
}): AdapterUser {
  return {
    id: user.id,
    email: user.email ?? "",
    emailVerified: user.emailVerified,
    name: user.name,
    image: user.image,
  };
}

function assertOAuthEncryptionReady(): void {
  if (!isOAuthEncryptionConfigured()) {
    throw new Error("OAUTH_ENCRYPTION_KEY must be set when OAuth is enabled");
  }
}

/** OAuth 가입 시 username·profile 자동 생성 + OAuth PII 암호화 */
export function createPrismaAuthAdapter(): Adapter {
  const base = PrismaAdapter(db);

  return {
    ...base,
    createUser: async (data) => {
      const seed = data.email ?? data.name ?? "user";
      const username = await generateUniqueUsername(seed);
      const displayName = data.name?.trim() || username;

      const nameCheck = validateUsernameAndName(username, displayName);
      if (!nameCheck.ok) {
        throw new Error(FORBIDDEN_ADMIN_SEQUENCE_MESSAGE);
      }

      const user = await db.user.create({
        data: {
          email: data.email,
          emailVerified: data.emailVerified,
          name: displayName,
          image: data.image,
          username,
          profile: { create: {} },
          otakuProfile: { create: {} },
        },
      });

      return toAdapterUser(user);
    },

    getUserByEmail: async (email) => {
      const normalized = email.trim().toLowerCase();
      const user = await db.user.findUnique({ where: { email: normalized } });
      if (user) return toAdapterUser(user);

      const oauthUserId = await findUserIdByOAuthEmail(normalized);
      if (!oauthUserId) return null;

      const oauthUser = await db.user.findUnique({ where: { id: oauthUserId } });
      return oauthUser ? toAdapterUser(oauthUser) : null;
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      if (isOAuthVaultProvider(provider)) {
        assertOAuthEncryptionReady();
        const match = await findOAuthAccountBySub(provider, providerAccountId);
        return match ? toAdapterUser(match.user) : null;
      }
      return base.getUserByAccount!({ provider, providerAccountId });
    },

    linkAccount: async (account): Promise<AdapterAccount> => {
      if (!isOAuthVaultProvider(account.provider)) {
        const linked = await base.linkAccount!(account);
        if (!linked) {
          throw new Error("Failed to link OAuth account");
        }
        return linked;
      }

      assertOAuthEncryptionReady();

      const plainSub = account.providerAccountId;
      const existing = await db.account.findFirst({
        where: {
          provider: account.provider,
          userId: account.userId,
        },
        select: { id: true },
      });

      await persistEncryptedOAuthAccount({
        provider: account.provider,
        accountId: existing?.id,
        userId: account.userId,
        sub: plainSub,
        accessToken: account.access_token ?? null,
        refreshToken: account.refresh_token ?? null,
        idToken: account.id_token ?? null,
        expiresAt: account.expires_at ?? null,
        tokenType: account.token_type ?? null,
        scope: account.scope ?? null,
        sessionState:
          account.session_state != null ? String(account.session_state) : null,
        type: account.type,
      });

      const saved = await db.account.findFirst({
        where: {
          provider: account.provider,
          userId: account.userId,
        },
      });
      if (!saved) {
        throw new Error("Failed to persist encrypted OAuth account");
      }
      return saved as AdapterAccount;
    },
  };
}
