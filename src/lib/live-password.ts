import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 합방용 6자리 비밀번호 (혼동 문자 제외) */
export function generateLiveJoinPassword(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CHARS[randomInt(CHARS.length)];
  return code;
}

export async function hashLiveJoinPassword(password: string): Promise<string> {
  return bcrypt.hash(password.trim().toUpperCase(), 10);
}

export async function verifyLiveJoinPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password.trim().toUpperCase(), hash);
}
