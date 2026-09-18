import bcrypt from "bcryptjs";

const JOIN_PASSWORD_RE = /^\d{4}$/;

export function isValidCommunityJoinPassword(value: string): boolean {
  return JOIN_PASSWORD_RE.test(value);
}

export async function hashCommunityJoinPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyCommunityJoinPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
