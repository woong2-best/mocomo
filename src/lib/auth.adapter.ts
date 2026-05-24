import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { db } from "@/lib/db";

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

  while (await db.user.findUnique({ where: { username }, select: { id: true } })) {
    suffix += 1;
    username = `${base.slice(0, Math.max(3, 16 - String(suffix).length))}${suffix}`;
  }

  return username;
}

/** OAuth 가입 시 username·profile 자동 생성 */
export function createPrismaAuthAdapter(): Adapter {
  const base = PrismaAdapter(db);

  return {
    ...base,
    createUser: async (data) => {
      const seed = data.email ?? data.name ?? "user";
      const username = await generateUniqueUsername(seed);

      const user = await db.user.create({
        data: {
          email: data.email,
          emailVerified: data.emailVerified,
          name: data.name ?? username,
          image: data.image,
          username,
          profile: { create: {} },
          otakuProfile: { create: {} },
        },
      });

      return {
        id: user.id,
        email: user.email ?? "",
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
      } satisfies AdapterUser;
    },
  };
}
