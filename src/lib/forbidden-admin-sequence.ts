import type { PrismaClient } from "@prisma/client";
import { getOperatorUsername } from "@/lib/operator-config";

/** 대소문자 무관, 문자 사이에 다른 글자가 있어도 a→d→m→i→n 순서면 차단 */
const FORBIDDEN_LETTERS = ["a", "d", "m", "i", "n"] as const;

export const FORBIDDEN_ADMIN_SEQUENCE_MESSAGE =
  "닉네임 또는 표시 이름에 사용할 수 없는 문자 조합이 있습니다. 다른 닉네임·이름으로 다시 시도해 주세요.";

export function containsForbiddenAdminSequence(text: string): boolean {
  if (!text) return false;
  let idx = 0;
  for (const ch of text.toLowerCase()) {
    if (ch === FORBIDDEN_LETTERS[idx]) {
      idx += 1;
      if (idx === FORBIDDEN_LETTERS.length) return true;
    }
  }
  return false;
}

export function validateUsernameAndName(
  username: string,
  name?: string | null
): { ok: true } | { ok: false; error: string } {
  if (containsForbiddenAdminSequence(username)) {
    return { ok: false, error: FORBIDDEN_ADMIN_SEQUENCE_MESSAGE };
  }
  const trimmedName = name?.trim();
  if (trimmedName && containsForbiddenAdminSequence(trimmedName)) {
    return { ok: false, error: FORBIDDEN_ADMIN_SEQUENCE_MESSAGE };
  }
  return { ok: true };
}

/** @mocomocompany 제외, 닉네임·이름에 금지 순서가 있는 계정 삭제 */
export async function purgeForbiddenAdminSequenceUsers(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: { username: { not: getOperatorUsername(), mode: "insensitive" } },
    select: { id: true, username: true, name: true },
  });

  const targets = users.filter(
    (u) =>
      containsForbiddenAdminSequence(u.username) ||
      (u.name != null && containsForbiddenAdminSequence(u.name))
  );

  let deleted = 0;
  for (const u of targets) {
    try {
      await prisma.user.delete({ where: { id: u.id } });
      deleted += 1;
    } catch (e) {
      console.error("[purgeForbiddenAdminSequenceUsers]", u.username, e);
    }
  }

  return { scanned: users.length, deleted, usernames: targets.map((t) => t.username) };
}
