export const USERNAME_CHANGE_LIMIT = 2;
export const USERNAME_CHANGE_WINDOW_DAYS = 14;
export const USERNAME_CHANGE_WINDOW_MS =
  USERNAME_CHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const RESERVED_USERNAMES = new Set([
  "mocomo",
  "mocomo_official",
  "admin",
  "administrator",
  "support",
  "official",
  "system",
  "root",
  "help",
  "mocomocompany",
]);

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function usernameChangeWindowStart(now = new Date()): Date {
  return new Date(now.getTime() - USERNAME_CHANGE_WINDOW_MS);
}

export function usernameChangeResetAt(changes: { createdAt: Date }[]): Date | null {
  if (changes.length < USERNAME_CHANGE_LIMIT) return null;
  const oldest = changes[0];
  if (!oldest) return null;
  return new Date(oldest.createdAt.getTime() + USERNAME_CHANGE_WINDOW_MS);
}

export function usernameChangesRemaining(recentChangeCount: number): number {
  return Math.max(0, USERNAME_CHANGE_LIMIT - recentChangeCount);
}
