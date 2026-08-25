import { db } from "@/lib/db";

/** @username or username → trimmed handle without leading @. */
export function normalizeCreatorUsernameInput(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim().replace(/^@+/, "");
  if (!trimmed || trimmed.length > 64) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return null;
  return trimmed;
}

/** Resolve creator scope from @handle or internal user id (cuid). */
export async function resolveCreatorUserId(raw: string | null | undefined): Promise<string | null> {
  const normalized = normalizeCreatorUsernameInput(raw);
  if (!normalized) return null;

  if (/^c[a-z0-9]{20,32}$/i.test(normalized)) {
    const byId = await db.user.findUnique({
      where: { id: normalized },
      select: { id: true },
    });
    return byId?.id ?? null;
  }

  const byUsername = await db.user.findUnique({
    where: { username: normalized },
    select: { id: true },
  });
  return byUsername?.id ?? null;
}
