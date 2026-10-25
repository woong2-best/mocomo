import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  PLATFORM_OFFICIAL_EMAIL,
  PLATFORM_OFFICIAL_USERNAME,
  type AvatarAccountDef,
} from "@/lib/ai-live/official-channel-id";

const BCRYPT_ROUNDS = 10;

let hashMemo: { password: string; hash: string } | null = null;

function avatarPassword(): string | null {
  const raw = process.env.AI_AVATAR_ACCOUNT_PASSWORD?.trim();
  return raw && raw.length >= 8 ? raw : null;
}

async function avatarPasswordHash(): Promise<string | null> {
  const password = avatarPassword();
  if (!password) return null;
  if (hashMemo?.password === password) return hashMemo.hash;
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  hashMemo = { password, hash };
  return hash;
}

function isPlatformBootstrapUser(user: { username: string; email?: string | null }): boolean {
  const email = user.email?.trim().toLowerCase();
  if (email === PLATFORM_OFFICIAL_EMAIL) return true;
  return user.username.trim().toLowerCase() === PLATFORM_OFFICIAL_USERNAME && email === PLATFORM_OFFICIAL_EMAIL;
}

async function findByUsername(username: string) {
  return db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true, email: true, role: true, passwordHash: true },
  });
}

/**
 * One real ADMIN user per avatar. The shared password lives in
 * AI_AVATAR_ACCOUNT_PASSWORD — never in git.
 */
export async function ensureAvatarAccount(profile: AvatarAccountDef): Promise<string> {
  const passwordHash = await avatarPasswordHash();

  let row = await findByUsername(profile.username);
  if (!row) {
    for (const legacy of profile.legacyUsernames) {
      const found = await findByUsername(legacy);
      if (found && !isPlatformBootstrapUser(found)) {
        row = found;
        break;
      }
    }
  }

  if (!row) {
    try {
      const created = await db.user.create({
        data: {
          username: profile.username,
          name: profile.name,
          locale: "en",
          countryCode: "KR",
          role: "ADMIN",
          ...(passwordHash ? { passwordHash } : {}),
        },
        select: { id: true },
      });
      return created.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const again = await findByUsername(profile.username);
        if (again) return again.id;
      }
      throw err;
    }
  }

  const isLegacyUsername = profile.legacyUsernames.some(
    (legacy) => row.username.trim().toLowerCase() === legacy.trim().toLowerCase()
  );

  try {
    await db.user.update({
      where: { id: row.id },
      data: {
        ...(isLegacyUsername ? { username: profile.username } : {}),
        role: "ADMIN",
        adminDisabledAt: null,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
    await db.user.update({
      where: { id: row.id },
      data: {
        role: "ADMIN",
        adminDisabledAt: null,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  }

  return row.id;
}
