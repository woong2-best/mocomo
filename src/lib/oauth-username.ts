import { db } from "@/lib/db";
import { containsForbiddenAdminSequence } from "@/lib/forbidden-admin-sequence";

/** Derive a free `@username` from an OAuth email/name seed. */
export async function generateUniqueUsername(seed: string): Promise<string> {
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
