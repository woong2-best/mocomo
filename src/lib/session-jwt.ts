import { edgeAuth } from "@/lib/auth.edge";

/** JWT only — no Prisma. Use for high-frequency poll / socket / push routes. */
export async function getJwtSessionUser() {
  try {
    const session = await edgeAuth();
    const id = session?.user?.id;
    if (!id) return null;
    return {
      id,
      isBanned: Boolean(session.user.isBanned),
    };
  } catch {
    return null;
  }
}
